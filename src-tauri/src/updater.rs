use crate::models::{ActionResult, AppUpdateState};
use futures_util::StreamExt;
use semver::Version;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

/// 在 GitHub Actions 编译阶段通过环境变量 `STUDYHUB_GITHUB_REPO=owner/repo` 自动注入
const GITHUB_REPO: Option<&str> = option_env!("STUDYHUB_GITHUB_REPO");

#[derive(Debug, Clone)]
struct PendingDownload {
    version: String,
    asset_name: String,
    download_url: String,
    checksums_url: Option<String>,
}

pub struct UpdaterManager {
    state: Mutex<AppUpdateState>,
    pending: Mutex<Option<PendingDownload>>,
    downloaded_path: Mutex<Option<PathBuf>>,
    github_repo: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GithubReleaseAsset {
    name: String,
    browser_download_url: String,
    #[serde(default)]
    size: u64,
}

#[derive(Debug, Deserialize)]
struct GithubReleaseResponse {
    tag_name: String,
    #[serde(default)]
    html_url: String,
    #[serde(default)]
    assets: Vec<GithubReleaseAsset>,
}

impl UpdaterManager {
    pub fn new(current_version: String) -> Self {
        let is_packaged = !cfg!(debug_assertions);
        let is_portable = std::env::current_exe()
            .ok()
            .and_then(|p| p.file_name().map(|n| n.to_string_lossy().to_lowercase()))
            .map(|n| n.contains("portable"))
            .unwrap_or(false);

        let github_repo = GITHUB_REPO
            .map(str::trim)
            .filter(|s| s.contains('/') && !s.is_empty())
            .map(|s| s.to_string());

        let repo_url = github_repo
            .as_ref()
            .map(|r| format!("https://github.com/{r}/releases"));

        let has_repo = github_repo.is_some();
        let supported = cfg!(target_os = "windows") && is_packaged && !is_portable && has_repo;

        let message = if !cfg!(target_os = "windows") {
            Some("应用内安装升级仅支持 Windows 安装版客户端。".to_string())
        } else if !is_packaged {
            Some("当前为开发调试模式；安装通过 GitHub Actions 发布的 Windows 安装版后即可应用内直连升级。".to_string())
        } else if is_portable {
            Some("便携版（Portable）不支持原地自动覆盖升级，请下载安装版（Setup.exe）或点击右侧按钮前往 GitHub Releases 获取新版。".to_string())
        } else if !has_repo {
            Some("当前本地构建未注入 GitHub 仓库信息；使用 GitHub Actions 发布的安装包即可在应用内直连 GitHub Releases 一键升级。".to_string())
        } else {
            Some("直连你的 GitHub Releases（免密钥 + SHA-256 完整性校验），升级不会影响本地学习数据文件夹。".to_string())
        };

        let initial_state = AppUpdateState {
            current_version,
            is_packaged,
            is_portable,
            supported,
            phase: if supported {
                "idle".to_string()
            } else {
                "unsupported".to_string()
            },
            latest_version: None,
            percent: None,
            transferred: None,
            total: None,
            bytes_per_second: None,
            message,
            repo_url,
        };

        Self {
            state: Mutex::new(initial_state),
            pending: Mutex::new(None),
            downloaded_path: Mutex::new(None),
            github_repo,
        }
    }

    pub fn get_state(&self) -> AppUpdateState {
        self.state.lock().unwrap().clone()
    }

    fn update_and_emit<F>(&self, app: &AppHandle, mutator: F) -> AppUpdateState
    where
        F: FnOnce(&mut AppUpdateState),
    {
        let snapshot = {
            let mut guard = self.state.lock().unwrap();
            mutator(&mut guard);
            guard.clone()
        };
        let _ = app.emit("studyhub:update-status", &snapshot);
        snapshot
    }

    fn build_http_client(&self) -> Result<reqwest::Client, String> {
        let ver = self.get_state().current_version;
        reqwest::Client::builder()
            .user_agent(format!("Joel-StudyHub/{ver}"))
            .timeout(Duration::from_secs(600))
            .connect_timeout(Duration::from_secs(20))
            .build()
            .map_err(|e| format!("初始化网络客户端失败: {e}"))
    }

    pub async fn check_for_updates(&self, app: &AppHandle) -> AppUpdateState {
        let current = self.get_state();
        if !current.supported
            || current.phase == "checking"
            || current.phase == "downloading"
        {
            return current;
        }
        let Some(repo) = self.github_repo.clone() else {
            return current;
        };

        self.update_and_emit(app, |s| {
            s.phase = "checking".to_string();
            s.percent = None;
            s.transferred = None;
            s.total = None;
            s.bytes_per_second = None;
            s.message = Some("正在连接 GitHub Releases 检查最新版本…".to_string());
        });

        let client = match self.build_http_client() {
            Ok(c) => c,
            Err(err) => {
                return self.update_and_emit(app, |s| {
                    s.phase = "error".to_string();
                    s.message = Some(err);
                });
            }
        };

        let api_url = format!("https://api.github.com/repos/{repo}/releases/latest");
        let resp = match client
            .get(&api_url)
            .header("Accept", "application/vnd.github+json")
            .send()
            .await
        {
            Ok(r) => r,
            Err(err) => {
                return self.update_and_emit(app, |s| {
                    s.phase = "error".to_string();
                    s.message = Some(format!("无法连接 GitHub Releases：{err}"));
                });
            }
        };

        if !resp.status().is_success() {
            let code = resp.status().as_u16();
            return self.update_and_emit(app, |s| {
                s.phase = "error".to_string();
                s.message = Some(format!(
                    "GitHub Releases 查询失败 (HTTP {code})，请确认仓库为公开仓库且已发布 Release。"
                ));
            });
        }

        let release: GithubReleaseResponse = match resp.json().await {
            Ok(r) => r,
            Err(err) => {
                return self.update_and_emit(app, |s| {
                    s.phase = "error".to_string();
                    s.message = Some(format!("解析 GitHub Release 响应失败：{err}"));
                });
            }
        };

        let latest_clean = strip_v_prefix(&release.tag_name);
        let current_clean = strip_v_prefix(&current.current_version);

        let is_newer = is_semver_newer(&current_clean, &latest_clean);
        if !is_newer {
            return self.update_and_emit(app, |s| {
                s.phase = "not-available".to_string();
                s.latest_version = Some(latest_clean.clone());
                if !release.html_url.is_empty() {
                    s.repo_url = Some(release.html_url.clone());
                }
                s.message = Some(format!("当前已是最新版本 (v{})。", s.current_version));
            });
        }

        let installer = select_windows_installer(&release.assets);
        let Some(installer_asset) = installer else {
            return self.update_and_emit(app, |s| {
                s.phase = "error".to_string();
                s.latest_version = Some(latest_clean.clone());
                s.message = Some(format!(
                    "发现新版本 v{latest_clean}，但该 Release 中未找到 Windows 安装包 (.exe)。"
                ));
            });
        };

        let checksums_url = release
            .assets
            .iter()
            .find(|a| a.name.eq_ignore_ascii_case("checksums.txt"))
            .map(|a| a.browser_download_url.clone());

        {
            let mut pending = self.pending.lock().unwrap();
            *pending = Some(PendingDownload {
                version: latest_clean.clone(),
                asset_name: installer_asset.name.clone(),
                download_url: installer_asset.browser_download_url.clone(),
                checksums_url,
            });
        }

        self.update_and_emit(app, |s| {
            s.phase = "available".to_string();
            s.latest_version = Some(latest_clean.clone());
            s.total = if installer_asset.size > 0 {
                Some(installer_asset.size)
            } else {
                None
            };
            s.message = Some(format!(
                "发现新版本 v{latest_clean}，点击下方按钮即可直接下载并校验安装。"
            ));
        })
    }

    pub async fn download_update(&self, app: &AppHandle) -> AppUpdateState {
        let current = self.get_state();
        if !current.supported || current.phase == "downloading" {
            return current;
        }
        let pending = self.pending.lock().unwrap().clone();
        let Some(pending) = pending else {
            return self.update_and_emit(app, |s| {
                s.phase = "error".to_string();
                s.message = Some("尚未检测到可下载的新版本，请先点击「检查更新」。".to_string());
            });
        };

        self.update_and_emit(app, |s| {
            s.phase = "downloading".to_string();
            s.percent = Some(0);
            s.transferred = Some(0);
            s.bytes_per_second = Some(0);
            s.message = Some(format!(
                "正在从 GitHub Releases 下载 v{} 安装包…",
                pending.version
            ));
        });

        let client = match self.build_http_client() {
            Ok(c) => c,
            Err(err) => {
                return self.update_and_emit(app, |s| {
                    s.phase = "error".to_string();
                    s.message = Some(err);
                });
            }
        };

        // 如果 Release 附带 checksums.txt，先拉取期望的 SHA-256 哈希
        let expected_sha256: Option<String> = if let Some(cs_url) = &pending.checksums_url {
            match client.get(cs_url).send().await {
                Ok(r) if r.status().is_success() => r
                    .text()
                    .await
                    .ok()
                    .and_then(|body| parse_sha256_for_asset(&body, &pending.asset_name)),
                _ => None,
            }
        } else {
            None
        };

        let resp = match client.get(&pending.download_url).send().await {
            Ok(r) if r.status().is_success() => r,
            Ok(r) => {
                let code = r.status().as_u16();
                return self.update_and_emit(app, |s| {
                    s.phase = "error".to_string();
                    s.message = Some(format!("下载安装包失败 (HTTP {code})"));
                });
            }
            Err(err) => {
                return self.update_and_emit(app, |s| {
                    s.phase = "error".to_string();
                    s.message = Some(format!("下载安装包中断：{err}"));
                });
            }
        };

        let total_size = resp.content_length().unwrap_or(0);
        let temp_dir = std::env::temp_dir().join("StudyHub-Updates");
        if let Err(err) = fs::create_dir_all(&temp_dir) {
            return self.update_and_emit(app, |s| {
                s.phase = "error".to_string();
                s.message = Some(format!("无法创建临时下载目录：{err}"));
            });
        }
        let target_path = temp_dir.join(&pending.asset_name);
        let tmp_path = temp_dir.join(format!("{}.part", pending.asset_name));

        let mut file = match File::create(&tmp_path) {
            Ok(f) => f,
            Err(err) => {
                return self.update_and_emit(app, |s| {
                    s.phase = "error".to_string();
                    s.message = Some(format!("无法创建临时安装包文件：{err}"));
                });
            }
        };

        let mut hasher = Sha256::new();
        let mut downloaded: u64 = 0;
        let started_at = Instant::now();
        let mut last_emit = Instant::now();
        let mut stream = resp.bytes_stream();

        while let Some(chunk_res) = stream.next().await {
            let chunk = match chunk_res {
                Ok(c) => c,
                Err(err) => {
                    let _ = fs::remove_file(&tmp_path);
                    return self.update_and_emit(app, |s| {
                        s.phase = "error".to_string();
                        s.message = Some(format!("读取更新包数据失败：{err}"));
                    });
                }
            };
            if let Err(err) = file.write_all(&chunk) {
                let _ = fs::remove_file(&tmp_path);
                return self.update_and_emit(app, |s| {
                    s.phase = "error".to_string();
                    s.message = Some(format!("写入更新包失败：{err}"));
                });
            }
            hasher.update(&chunk);
            downloaded += chunk.len() as u64;

            if last_emit.elapsed() >= Duration::from_millis(120) {
                last_emit = Instant::now();
                let elapsed = started_at.elapsed().as_secs_f64().max(0.05);
                let speed = (downloaded as f64 / elapsed) as u64;
                let pct = if total_size > 0 {
                    ((downloaded as f64 / total_size as f64) * 100.0).round() as u32
                } else {
                    0
                };
                self.update_and_emit(app, |s| {
                    s.phase = "downloading".to_string();
                    s.percent = Some(pct.min(99));
                    s.transferred = Some(downloaded);
                    s.total = if total_size > 0 {
                        Some(total_size)
                    } else {
                        None
                    };
                    s.bytes_per_second = Some(speed);
                    s.message = Some(format!("正在下载更新包 ({pct}%)…"));
                });
            }
        }

        drop(file);
        let actual_sha256 = hex::encode(hasher.finalize());

        if let Some(expected) = expected_sha256 {
            if !actual_sha256.eq_ignore_ascii_case(&expected) {
                let _ = fs::remove_file(&tmp_path);
                return self.update_and_emit(app, |s| {
                    s.phase = "error".to_string();
                    s.message = Some(
                        "更新包 SHA-256 完整性校验失败，已自动丢弃该文件，请重新检查并下载。"
                            .to_string(),
                    );
                });
            }
        }

        if let Err(err) = fs::rename(&tmp_path, &target_path) {
            let _ = fs::remove_file(&tmp_path);
            return self.update_and_emit(app, |s| {
                s.phase = "error".to_string();
                s.message = Some(format!("保存更新安装包失败：{err}"));
            });
        }

        {
            let mut dl = self.downloaded_path.lock().unwrap();
            *dl = Some(target_path);
        }

        self.update_and_emit(app, |s| {
            s.phase = "downloaded".to_string();
            s.latest_version = Some(pending.version.clone());
            s.percent = Some(100);
            s.transferred = Some(downloaded);
            s.total = Some(downloaded.max(total_size));
            s.bytes_per_second = None;
            s.message = Some(format!(
                "v{} 已下载并完成 SHA-256 校验，点击「立即重启并安装」启动安装向导完成升级。",
                pending.version
            ));
        })
    }

    pub fn quit_and_install(&self, app: &AppHandle) -> ActionResult {
        let current = self.get_state();
        if !current.supported || current.phase != "downloaded" {
            return ActionResult {
                ok: false,
                error: Some("尚无已完成校验的安装包".to_string()),
            };
        }
        let installer_path = self.downloaded_path.lock().unwrap().clone();
        let Some(installer_path) = installer_path else {
            return ActionResult {
                ok: false,
                error: Some("安装包路径丢失，请重新下载".to_string()),
            };
        };
        if !installer_path.exists() {
            return ActionResult {
                ok: false,
                error: Some("临时安装包文件已不存在，请重新下载".to_string()),
            };
        }

        if let Err(err) = std::process::Command::new(&installer_path).spawn() {
            return ActionResult {
                ok: false,
                error: Some(format!("无法启动安装程序：{err}")),
            };
        }

        let app_clone = app.clone();
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(180));
            app_clone.exit(0);
        });

        ActionResult {
            ok: true,
            error: None,
        }
    }
}

pub fn strip_v_prefix(raw: &str) -> String {
    raw.trim()
        .trim_start_matches('v')
        .trim_start_matches('V')
        .to_string()
}

pub fn is_semver_newer(current_ver: &str, latest_ver: &str) -> bool {
    match (Version::parse(current_ver), Version::parse(latest_ver)) {
        (Ok(cur), Ok(lat)) => lat > cur,
        _ => latest_ver != current_ver && !latest_ver.is_empty(),
    }
}

fn select_windows_installer(assets: &[GithubReleaseAsset]) -> Option<&GithubReleaseAsset> {
    // 优先选择 Setup 安装版（排除 Portable 便携版）
    assets
        .iter()
        .find(|a| {
            let lower = a.name.to_lowercase();
            lower.ends_with(".exe") && lower.contains("setup") && !lower.contains("portable")
        })
        .or_else(|| {
            assets.iter().find(|a| {
                let lower = a.name.to_lowercase();
                lower.ends_with(".exe") && !lower.contains("portable")
            })
        })
}

pub fn parse_sha256_for_asset(checksums_text: &str, asset_name: &str) -> Option<String> {
    for line in checksums_text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        let mut parts = trimmed.split_whitespace();
        let hash = parts.next()?;
        let name = parts.next()?.trim_start_matches('*');
        if hash.len() == 64 && name.eq_ignore_ascii_case(asset_name) {
            return Some(hash.to_lowercase());
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn semver_comparison_works_with_v_prefix() {
        assert!(is_semver_newer(&strip_v_prefix("v1.0.0"), &strip_v_prefix("v1.0.1")));
        assert!(is_semver_newer("1.0.1", "1.1.0"));
        assert!(!is_semver_newer("1.0.1", "1.0.1"));
        assert!(!is_semver_newer("1.1.0", "1.0.9"));
    }

    #[test]
    fn checksums_parser_matches_exact_asset_name() {
        let sample = "\
aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa  StudyHub-Setup-1.0.1.exe
bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb *StudyHub-Portable-1.0.1.exe
";
        assert_eq!(
            parse_sha256_for_asset(sample, "StudyHub-Setup-1.0.1.exe"),
            Some("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".to_string())
        );
        assert_eq!(
            parse_sha256_for_asset(sample, "StudyHub-Portable-1.0.1.exe"),
            Some("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb".to_string())
        );
        assert_eq!(parse_sha256_for_asset(sample, "missing.exe"), None);
    }
}
