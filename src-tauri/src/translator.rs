use crate::dictionary::clean_token;
use crate::models::{
    FetchModelsInput, FetchModelsResult, LookupResult, SaveTranslationConfigInput,
    TranslateWordInput, TranslationApiStatus,
};
use crate::storage::atomic_write_file;
use reqwest::Url;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::{BTreeSet, HashMap};
use std::fs;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use std::path::Path;
use std::sync::OnceLock;
use std::time::Duration;

const REQUEST_TIMEOUT_SECS: u64 = 15;
static SHARED_HTTP_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

fn shared_http_client() -> Result<&'static reqwest::Client, String> {
    if let Some(client) = SHARED_HTTP_CLIENT.get() {
        return Ok(client);
    }
    let built = reqwest::Client::builder()
        .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
        .pool_max_idle_per_host(4)
        .build()
        .map_err(|e| format!("初始化 HTTP 客户端失败: {e}"))?;
    let _ = SHARED_HTTP_CLIENT.set(built);
    SHARED_HTTP_CLIENT
        .get()
        .ok_or_else(|| "初始化 HTTP 客户端失败".to_string())
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredTranslationConfig {
    #[serde(default)]
    base_url: String,
    #[serde(default)]
    api_key: String,
    #[serde(default)]
    model: String,
}

#[derive(Debug, Clone)]
struct ResolvedConfig {
    base_url: String,
    api_key: String,
    model: String,
}

fn parse_dotenv_file(path: &Path) -> HashMap<String, String> {
    let mut map = HashMap::new();
    let Ok(raw) = fs::read_to_string(path) else {
        return map;
    };
    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        if let Some((k, v)) = trimmed.split_once('=') {
            let key = k.trim().to_string();
            let val = v
                .trim()
                .trim_matches('"')
                .trim_matches('\'')
                .trim()
                .to_string();
            if !key.is_empty() && !val.is_empty() {
                map.insert(key, val);
            }
        }
    }
    map
}

fn read_env_var(key: &str, data_dir: Option<&Path>) -> String {
    if let Ok(val) = std::env::var(key) {
        let trimmed = val.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }
    if let Some(dir) = data_dir {
        let dotenv_map = parse_dotenv_file(&dir.join(".env"));
        if let Some(val) = dotenv_map.get(key) {
            return val.clone();
        }
    }
    String::new()
}

fn read_stored_config(config_path: &Path) -> StoredTranslationConfig {
    let Ok(raw) = fs::read_to_string(config_path) else {
        return StoredTranslationConfig::default();
    };
    let Ok(root) = serde_json::from_str::<Value>(&raw) else {
        return StoredTranslationConfig::default();
    };
    root.get("translation")
        .and_then(|v| serde_json::from_value::<StoredTranslationConfig>(v.clone()).ok())
        .unwrap_or_default()
}

fn mask_api_key(key: &str) -> Option<String> {
    let trimmed = key.trim();
    if trimmed.is_empty() {
        return None;
    }
    let chars: Vec<char> = trimmed.chars().collect();
    if chars.len() <= 8 {
        Some("****".to_string())
    } else {
        let head: String = chars.iter().take(4).collect();
        let tail: String = chars[chars.len() - 4..].iter().collect();
        Some(format!("{head}****{tail}"))
    }
}

fn is_restricted_ipv4(ip: Ipv4Addr) -> bool {
    let o = ip.octets();
    // 允许 127.0.0.0/8 本地回环地址（用于 Magpie / Ollama 等本机大模型网关），屏蔽 0.0.0.0 与内网/云元数据网段
    o[0] == 0
        || o[0] == 10
        || (o[0] == 169 && o[1] == 254)
        || (o[0] == 172 && (16..=31).contains(&o[1]))
        || (o[0] == 192 && o[1] == 168)
        || (o[0] == 100 && (64..=127).contains(&o[1]))
}

fn is_restricted_ipv6(ip: Ipv6Addr) -> bool {
    if ip.is_unspecified() {
        return true;
    }
    if ip.is_loopback() {
        return false;
    }
    if let Some(v4) = ip.to_ipv4_mapped() {
        return is_restricted_ipv4(v4);
    }
    let seg0 = ip.segments()[0];
    (seg0 & 0xfe00) == 0xfc00 || (seg0 & 0xffc0) == 0xfe80
}

pub fn validate_translation_endpoint(raw_url: &str) -> Result<Url, String> {
    let trimmed = raw_url.trim();
    if trimmed.is_empty() {
        return Err("请填写 Base URL（例如 https://ark.cn-beijing.volces.com/api/v3 或 http://127.0.0.1:3425/v1）".to_string());
    }
    let parsed = Url::parse(trimmed).map_err(|_| "Base URL 格式无效，请以 https:// 或 http:// 开头".to_string())?;
    let scheme = parsed.scheme();
    if scheme != "https" && scheme != "http" {
        return Err("Base URL 仅支持 https:// 或 http:// 协议".to_string());
    }
    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err("Base URL 不允许内嵌凭据".to_string());
    }
    let host = parsed
        .host_str()
        .ok_or_else(|| "Base URL 缺少有效主机名".to_string())?
        .trim_matches(|c| c == '[' || c == ']')
        .to_lowercase();

    if matches!(
        host.as_str(),
        "metadata.google.internal" | "metadata" | "instance-data"
    ) || host.ends_with(".local")
        || host.ends_with(".internal")
    {
        return Err("出于安全限制，接口地址不允许指向局域网广播主机或云元数据服务".to_string());
    }

    if let Ok(ip) = host.parse::<IpAddr>() {
        let restricted = match ip {
            IpAddr::V4(v4) => is_restricted_ipv4(v4),
            IpAddr::V6(v6) => is_restricted_ipv6(v6),
        };
        if restricted {
            return Err("出于安全限制，接口地址不允许指向内网私网或云元数据 IP 地址".to_string());
        }
    }

    Ok(parsed)
}

fn normalize_base_url(parsed: &Url) -> String {
    let mut cloned = parsed.clone();
    let mut clean_path = cloned.path().trim_end_matches('/').to_string();
    for suffix in ["/chat/completions", "/responses", "/models"] {
        if clean_path.to_lowercase().ends_with(suffix) {
            let new_len = clean_path.len() - suffix.len();
            clean_path.truncate(new_len);
            clean_path = clean_path.trim_end_matches('/').to_string();
        }
    }
    cloned.set_path(&clean_path);
    cloned.set_query(None);
    cloned.set_fragment(None);
    cloned.to_string().trim_end_matches('/').to_string()
}

fn build_api_url(base_url: &str, suffix: &str) -> String {
    format!(
        "{}/{}",
        base_url.trim_end_matches('/'),
        suffix.trim_start_matches('/')
    )
}

pub fn save_translation_config(
    config_path: &Path,
    data_dir: Option<&Path>,
    input: SaveTranslationConfigInput,
) -> Result<TranslationApiStatus, String> {
    let raw_base_url = input.base_url.trim();
    let model = input.model.trim().to_string();
    let existing = read_stored_config(config_path);

    let normalized_base_url = if raw_base_url.is_empty() {
        String::new()
    } else {
        let parsed = validate_translation_endpoint(raw_base_url)?;
        normalize_base_url(&parsed)
    };

    let next_api_key = if input.clear_api_key {
        String::new()
    } else if let Some(new_key) = input.api_key {
        let trimmed = new_key.trim();
        if trimmed.is_empty() {
            existing.api_key
        } else {
            trimmed.to_string()
        }
    } else {
        existing.api_key
    };

    let mut root_obj = fs::read_to_string(config_path)
        .ok()
        .and_then(|raw| serde_json::from_str::<Value>(&raw).ok())
        .and_then(|v| v.as_object().cloned())
        .unwrap_or_default();

    let stored = StoredTranslationConfig {
        base_url: normalized_base_url,
        api_key: next_api_key,
        model,
    };
    let stored_val = serde_json::to_value(&stored).map_err(|e| format!("序列化翻译配置失败: {e}"))?;
    root_obj.insert("translation".to_string(), stored_val);

    let json = serde_json::to_string_pretty(&Value::Object(root_obj))
        .map_err(|e| format!("序列化配置文件失败: {e}"))?;
    atomic_write_file(config_path, &json)?;

    Ok(get_translation_status(config_path, data_dir))
}

fn resolve_config(
    config_path: &Path,
    data_dir: Option<&Path>,
) -> (Option<ResolvedConfig>, TranslationApiStatus) {
    let stored = read_stored_config(config_path);
    let env_base_url = read_env_var("TRANSLATE_API_BASE_URL", data_dir);
    let has_usable_env_base = env_base_url.to_lowercase().starts_with("http://")
        || env_base_url.to_lowercase().starts_with("https://");

    let raw_base_url = if !stored.base_url.trim().is_empty() {
        stored.base_url.trim().to_string()
    } else if has_usable_env_base {
        env_base_url
    } else {
        String::new()
    };
    let api_key = if !stored.api_key.trim().is_empty() {
        stored.api_key.trim().to_string()
    } else if has_usable_env_base {
        read_env_var("TRANSLATE_API_KEY", data_dir)
    } else {
        String::new()
    };
    let model = if !stored.model.trim().is_empty() {
        stored.model.trim().to_string()
    } else if has_usable_env_base {
        read_env_var("TRANSLATE_API_MODEL", data_dir)
    } else {
        String::new()
    };

    if raw_base_url.is_empty() {
        return (
            None,
            TranslationApiStatus {
                configured: false,
                base_url: String::new(),
                model,
                endpoint_host: String::new(),
                has_api_key: !api_key.is_empty(),
                api_key_preview: mask_api_key(&api_key),
                error: None,
            },
        );
    }

    match validate_translation_endpoint(&raw_base_url) {
        Err(err) => (
            None,
            TranslationApiStatus {
                configured: false,
                base_url: raw_base_url,
                model,
                endpoint_host: String::new(),
                has_api_key: !api_key.is_empty(),
                api_key_preview: mask_api_key(&api_key),
                error: Some(err),
            },
        ),
        Ok(parsed) => {
            let endpoint_host = match parsed.port() {
                Some(port) => format!("{}:{port}", parsed.host_str().unwrap_or("")),
                None => parsed.host_str().unwrap_or("").to_string(),
            };
            let normalized = normalize_base_url(&parsed);
            let configured = !normalized.is_empty() && !model.is_empty();
            (
                Some(ResolvedConfig {
                    base_url: normalized.clone(),
                    api_key: api_key.clone(),
                    model: model.clone(),
                }),
                TranslationApiStatus {
                    configured,
                    base_url: normalized,
                    model,
                    endpoint_host,
                    has_api_key: !api_key.is_empty(),
                    api_key_preview: mask_api_key(&api_key),
                    error: None,
                },
            )
        }
    }
}

pub fn get_translation_status(
    config_path: &Path,
    data_dir: Option<&Path>,
) -> TranslationApiStatus {
    resolve_config(config_path, data_dir).1
}

pub fn parse_models_list_payload(payload: &Value) -> Vec<String> {
    let mut ids = BTreeSet::new();
    let collect = |arr: &[Value], set: &mut BTreeSet<String>| {
        for item in arr {
            if let Some(s) = item.as_str() {
                let trimmed = s.trim();
                if !trimmed.is_empty() {
                    set.insert(trimmed.to_string());
                }
            } else if let Some(obj) = item.as_object() {
                let candidate = obj
                    .get("id")
                    .or_else(|| obj.get("name"))
                    .or_else(|| obj.get("model"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim();
                if !candidate.is_empty() {
                    set.insert(candidate.to_string());
                }
            }
        }
    };

    if let Some(arr) = payload.as_array() {
        collect(arr, &mut ids);
    } else if let Some(obj) = payload.as_object() {
        if let Some(arr) = obj.get("data").and_then(|v| v.as_array()) {
            collect(arr, &mut ids);
        }
        if let Some(arr) = obj.get("models").and_then(|v| v.as_array()) {
            collect(arr, &mut ids);
        }
    }

    ids.into_iter().collect()
}

pub async fn fetch_available_models(
    config_path: &Path,
    data_dir: Option<&Path>,
    input: FetchModelsInput,
) -> Result<FetchModelsResult, String> {
    let (saved_cfg, _) = resolve_config(config_path, data_dir);
    let raw_base_url = input
        .base_url
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .or_else(|| saved_cfg.as_ref().map(|c| c.base_url.clone()))
        .unwrap_or_default();

    let api_key = input
        .api_key
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .or_else(|| saved_cfg.as_ref().map(|c| c.api_key.clone()))
        .unwrap_or_default();

    let parsed = validate_translation_endpoint(&raw_base_url)?;
    let is_volces = parsed
        .host_str()
        .map(|h| h.to_lowercase().contains("volces.com"))
        .unwrap_or(false);
    let normalized = normalize_base_url(&parsed);
    let models_url = build_api_url(&normalized, "models");

    let client = shared_http_client()?;

    let mut req = client.get(&models_url).header("Accept", "application/json");
    if !api_key.is_empty() {
        req = req.header("Authorization", format!("Bearer {api_key}"));
    }

    let resp = req
        .send()
        .await
        .map_err(|e| format!("侦测模型列表失败: {e}"))?;

    let status_code = resp.status();
    let raw_text = resp
        .text()
        .await
        .map_err(|e| format!("读取模型列表响应失败: {e}"))?;

    if !status_code.is_success() {
        if is_volces {
            return Ok(FetchModelsResult {
                models: vec!["doubao-seed-translation-250915".to_string()],
                count: 1,
                note: Some(format!(
                    "火山方舟 /models 返回 HTTP {}，已提供豆包翻译默认模型 ID，也可直接输入你在控制台创建的模型/接入点 ID（如 ep-xxxx）。",
                    status_code.as_u16()
                )),
            });
        }
        let snippet: String = raw_text.chars().take(180).collect();
        return Err(format!(
            "侦测模型列表失败（HTTP {}）{}",
            status_code.as_u16(),
            if snippet.is_empty() {
                String::new()
            } else {
                format!(": {snippet}")
            }
        ));
    }

    let payload = serde_json::from_str::<Value>(&raw_text)
        .map_err(|_| "模型列表响应不是有效的 JSON 格式".to_string())?;
    let models = parse_models_list_payload(&payload);
    if models.is_empty() {
        let fallback = if is_volces {
            vec!["doubao-seed-translation-250915".to_string()]
        } else {
            Vec::new()
        };
        let count = fallback.len();
        return Ok(FetchModelsResult {
            models: fallback,
            count,
            note: Some("该接口未返回模型列表，可直接手动输入模型 ID。".to_string()),
        });
    }

    let count = models.len();
    Ok(FetchModelsResult {
        models,
        count,
        note: None,
    })
}

fn strip_markdown_fences(raw: &str) -> String {
    let trimmed = raw.trim();
    if let Some(rest) = trimmed.strip_prefix("```") {
        let rest = rest
            .strip_prefix("json")
            .or_else(|| rest.strip_prefix("JSON"))
            .unwrap_or(rest)
            .trim_start();
        if let Some(inner) = rest.strip_suffix("```") {
            return inner.trim().to_string();
        }
    }
    trimmed.to_string()
}

fn extract_first_json_object(raw: &str) -> Option<serde_json::Map<String, Value>> {
    let cleaned = strip_markdown_fences(raw);
    if let Ok(Value::Object(map)) = serde_json::from_str::<Value>(&cleaned) {
        return Some(map);
    }
    let start = cleaned.find('{')?;
    let end = cleaned.rfind('}')?;
    if end > start {
        if let Ok(Value::Object(map)) = serde_json::from_str::<Value>(&cleaned[start..=end]) {
            return Some(map);
        }
    }
    None
}

fn pick_str(map: &serde_json::Map<String, Value>, keys: &[&str]) -> String {
    for k in keys {
        if let Some(val) = map.get(*k).and_then(|v| v.as_str()) {
            let trimmed = val.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
    }
    String::new()
}

fn push_unique_str(
    out: &mut Vec<String>,
    raw: &str,
    excluded: &[String],
    limit: usize,
) {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return;
    }
    let lower = trimmed.to_lowercase();
    if excluded.iter().any(|e| e == &lower) {
        return;
    }
    if !out.iter().any(|existing| existing.to_lowercase() == lower) && out.len() < limit {
        out.push(trimmed.to_string());
    }
}

fn pick_str_list(
    map: &serde_json::Map<String, Value>,
    keys: &[&str],
    exclude_values: &[&str],
    limit: usize,
) -> Vec<String> {
    let excluded: Vec<String> = exclude_values
        .iter()
        .map(|v| v.trim().to_lowercase())
        .filter(|v| !v.is_empty())
        .collect();
    let mut out: Vec<String> = Vec::new();

    for k in keys {
        if let Some(val) = map.get(*k) {
            if let Some(arr) = val.as_array() {
                for item in arr {
                    if let Some(s) = item.as_str() {
                        push_unique_str(&mut out, s, &excluded, limit);
                    }
                }
                if !out.is_empty() {
                    return out;
                }
            } else if let Some(s) = val.as_str() {
                for part in s.split(|c: char| matches!(c, '；' | ';' | '，' | ',')) {
                    push_unique_str(&mut out, part, &excluded, limit);
                }
                if !out.is_empty() {
                    return out;
                }
            }
        }
    }
    out
}

fn extract_text_from_responses_api(map: &serde_json::Map<String, Value>) -> String {
    if let Some(s) = map.get("output_text").and_then(|v| v.as_str()) {
        let trimmed = s.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }
    if let Some(output) = map.get("output").and_then(|v| v.as_array()) {
        let mut parts = Vec::new();
        for item in output {
            if let Some(t) = item.get("text").and_then(|v| v.as_str()) {
                if !t.trim().is_empty() {
                    parts.push(t.trim().to_string());
                }
            }
            if let Some(content) = item.get("content").and_then(|v| v.as_array()) {
                for block in content {
                    if let Some(t) = block.get("text").and_then(|v| v.as_str()) {
                        if !t.trim().is_empty() {
                            parts.push(t.trim().to_string());
                        }
                    }
                }
            }
        }
        if !parts.is_empty() {
            return parts.join(" ");
        }
    }
    String::new()
}

pub fn parse_translation_payload(
    payload: &Value,
    fallback_surface: &str,
) -> Result<LookupResult, String> {
    let cleaned_surface = {
        let c = clean_token(fallback_surface);
        if c.is_empty() {
            fallback_surface.trim().to_string()
        } else {
            c
        }
    };

    let mut obj: Option<serde_json::Map<String, Value>> = None;
    let mut plain_fallback = String::new();

    if let Some(s) = payload.as_str() {
        obj = extract_first_json_object(s);
        plain_fallback = strip_markdown_fences(s);
    } else if let Some(map) = payload.as_object() {
        if let Some(choices) = map.get("choices").and_then(|v| v.as_array()) {
            if let Some(first) = choices.first() {
                let content = first
                    .get("message")
                    .and_then(|m| m.get("content"))
                    .and_then(|c| c.as_str())
                    .or_else(|| first.get("text").and_then(|t| t.as_str()))
                    .unwrap_or("");
                if !content.is_empty() {
                    obj = extract_first_json_object(content);
                    plain_fallback = strip_markdown_fences(content);
                }
            }
        } else if map.contains_key("output") || map.contains_key("output_text") {
            let text = extract_text_from_responses_api(map);
            if !text.is_empty() {
                obj = extract_first_json_object(&text);
                plain_fallback = strip_markdown_fences(&text);
            }
        } else if let Some(data_obj) = map.get("data").and_then(|v| v.as_object()) {
            obj = Some(data_obj.clone());
        } else {
            obj = Some(map.clone());
        }
    }

    let mut word = cleaned_surface.clone();
    let mut phonetic = String::new();
    let mut pos = String::new();
    let mut meaning_zh = String::new();
    let mut plain_zh = String::new();
    let mut alternatives: Vec<String> = Vec::new();
    let mut synonyms: Vec<String> = Vec::new();

    if let Some(map) = obj {
        let w = pick_str(&map, &["word", "lemma", "base_form"]);
        if !w.is_empty() {
            word = w;
        }
        phonetic = pick_str(&map, &["phonetic", "ipa"])
            .trim_matches('/')
            .to_string();
        pos = pick_str(&map, &["pos", "part_of_speech", "partOfSpeech"]);
        meaning_zh = pick_str(
            &map,
            &[
                "meaning_zh",
                "translation",
                "translated_text",
                "translatedText",
                "meaning",
                "result",
                "text",
            ],
        );
        plain_zh = pick_str(
            &map,
            &[
                "plain_zh",
                "plainZh",
                "simple_zh",
                "colloquial_zh",
                "explanation_zh",
                "explanation",
            ],
        );
        alternatives = pick_str_list(
            &map,
            &[
                "alternatives",
                "chinese_synonyms",
                "other_meanings",
                "cn_synonyms",
                "translations",
            ],
            &[&meaning_zh],
            6,
        );
        synonyms = pick_str_list(
            &map,
            &[
                "synonyms",
                "english_synonyms",
                "similar_words",
                "related_words",
            ],
            &[&word, &cleaned_surface],
            6,
        );
    }

    if meaning_zh.is_empty() && !plain_fallback.is_empty() {
        meaning_zh = plain_fallback
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
            .chars()
            .take(200)
            .collect();
    }

    if meaning_zh.is_empty() {
        return Err("翻译接口返回内容为空，无法解析中文释义".to_string());
    }

    let lemma_note = if word.to_lowercase() != cleaned_surface.to_lowercase() {
        Some(format!("{cleaned_surface} → {word}"))
    } else {
        None
    };

    Ok(LookupResult {
        word,
        surface: cleaned_surface,
        phonetic,
        pos,
        meaning_zh,
        plain_zh: if plain_zh.is_empty() {
            None
        } else {
            Some(plain_zh)
        },
        alternatives,
        synonyms,
        source: "api".to_string(),
        lemma_note,
        found: true,
        ..Default::default()
    })
}

fn is_dedicated_translation_model(model: &str) -> bool {
    let lower = model.trim().to_lowercase();
    lower.contains("doubao-seed-translation")
        || lower.contains("seed-translation")
        || lower.contains("doubao-translate")
        || lower.contains("volcengine-translate")
        || lower.contains("microsoft-translator")
        || lower.ends_with("-translate")
        || lower.ends_with("-translator")
        || lower.ends_with("/translate")
}

pub fn pick_fast_reasoning_effort(model: &str) -> Option<&'static str> {
    let lower = model.trim().to_lowercase();
    if lower.is_empty() || is_dedicated_translation_model(&lower) || lower.contains("hy4flash") {
        return None;
    }
    if lower.contains("deepseek") && !lower.contains("-max") {
        return Some("none");
    }
    if lower.contains("gpt-5") {
        return Some("none");
    }
    if lower.contains("minimax")
        || lower.contains("gemini")
        || lower.contains("deepseek-v4.1-flash-max")
        || lower.contains("claude")
        || lower.contains("gpt-6")
        || lower.starts_with("o1")
        || lower.starts_with("o3")
        || lower.starts_with("o4")
    {
        return Some("low");
    }
    None
}

pub async fn translate_word_with_api(
    config_path: &Path,
    data_dir: Option<&Path>,
    input: TranslateWordInput,
) -> Result<LookupResult, String> {
    let surface: String = input.surface.trim().chars().take(120).collect();
    if surface.is_empty() {
        return Err("缺少待翻译的英文单词或短语".to_string());
    }
    let sentence: String = input
        .sentence
        .unwrap_or_default()
        .trim()
        .chars()
        .take(1000)
        .collect();
    let subject: String = input
        .subject
        .unwrap_or_default()
        .trim()
        .chars()
        .take(80)
        .collect();

    let (config_opt, status) = resolve_config(config_path, data_dir);
    let config = config_opt
        .filter(|c| !c.model.is_empty())
        .ok_or_else(|| {
            status.error.unwrap_or_else(|| {
                "尚未完成翻译模型配置，请在「设置 → 翻译模型」填写 Base URL、API Key 并选择模型"
                    .to_string()
            })
        })?;

    let cleaned_word = {
        let c = clean_token(&surface);
        if c.is_empty() {
            surface.clone()
        } else {
            c
        }
    };

    let client = shared_http_client()?;

    let dedicated_translator = is_dedicated_translation_model(&config.model);

    // 1. 专用翻译模型（doubao-seed-translation-* / Magpie doubao-translate/* 等）优先走 /responses + translation_options
    if dedicated_translator {
        let responses_url = build_api_url(&config.base_url, "responses");
        let resp_body = json!({
            "model": config.model,
            "input": [{
                "role": "user",
                "content": [{
                    "type": "input_text",
                    "text": cleaned_word,
                    "translation_options": {
                        "source_language": "en",
                        "target_language": "zh"
                    }
                }]
            }]
        });
        let mut req = client
            .post(&responses_url)
            .header("Content-Type", "application/json")
            .json(&resp_body);
        if !config.api_key.is_empty() {
            req = req.header("Authorization", format!("Bearer {}", config.api_key));
        }
        if let Ok(resp) = req.send().await {
            let code = resp.status();
            let raw_text = resp.text().await.unwrap_or_default();
            if code.is_success() {
                let payload = serde_json::from_str::<Value>(&raw_text).unwrap_or(Value::String(raw_text));
                return parse_translation_payload(&payload, &surface);
            }
            if code.as_u16() == 401 || code.as_u16() == 403 {
                return Err(format!("翻译接口鉴权失败（HTTP {}），请检查 API Key 是否正确", code.as_u16()));
            }
        }
    }

    // 2. 标准 OpenAI 兼容 /chat/completions（启用连接复用 + 精简词典提示词 + 自动关闭多余思维链）
    let chat_url = build_api_url(&config.base_url, "chat/completions");
    let reasoning_effort = if dedicated_translator {
        None
    } else {
        pick_fast_reasoning_effort(&config.model)
    };
    let short_sentence: String = sentence.chars().take(240).collect();

    let build_chat_body = |with_reasoning_control: bool| -> Value {
        if dedicated_translator {
            return json!({
                "model": config.model,
                "messages": [{
                    "role": "user",
                    "content": cleaned_word
                }]
            });
        }
        let mut user_parts = Vec::new();
        if short_sentence.is_empty() {
            user_parts.push(cleaned_word.clone());
        } else {
            user_parts.push(format!("{cleaned_word} | 句: {short_sentence}"));
        }
        if !subject.is_empty() {
            user_parts.push(format!("课: {subject}"));
        }
        let mut obj = serde_json::Map::new();
        obj.insert("model".to_string(), json!(config.model));
        obj.insert("temperature".to_string(), json!(0.1));
        obj.insert(
            "messages".to_string(),
            json!([
                {
                    "role": "system",
                    "content": "英汉学习词典。只返回合法JSON：{\"word\":\"词原形\",\"phonetic\":\"音标(无斜杠)\",\"pos\":\"词性\",\"meaning_zh\":\"2-4个核心中文义项，；分隔\",\"plain_zh\":\"一句大白话通俗解释\",\"alternatives\":[\"2-3个直观中文说法\"],\"synonyms\":[\"2-3个英文同义词\"]}"
                },
                {
                    "role": "user",
                    "content": user_parts.join(" | ")
                }
            ]),
        );
        if with_reasoning_control {
            if let Some(effort) = reasoning_effort {
                obj.insert("reasoning_effort".to_string(), json!(effort));
                if effort == "none" {
                    obj.insert("max_tokens".to_string(), json!(260));
                }
            }
        }
        Value::Object(obj)
    };

    let send_chat = |body: Value| {
        let mut req = client
            .post(&chat_url)
            .header("Content-Type", "application/json")
            .json(&body);
        if !config.api_key.is_empty() {
            req = req.header("Authorization", format!("Bearer {}", config.api_key));
        }
        req.send()
    };

    let mut resp = send_chat(build_chat_body(true))
        .await
        .map_err(|e| format!("调用翻译接口失败: {e}"))?;

    if !resp.status().is_success()
        && reasoning_effort.is_some()
        && matches!(resp.status().as_u16(), 400 | 422)
    {
        resp = send_chat(build_chat_body(false))
            .await
            .map_err(|e| format!("调用翻译接口失败: {e}"))?;
    }

    let status_code = resp.status();
    let raw_text = resp
        .text()
        .await
        .map_err(|e| format!("读取翻译接口响应失败: {e}"))?;

    if !status_code.is_success() {
        let snippet: String = raw_text.chars().take(240).collect();
        return Err(format!("翻译接口返回 HTTP {}: {}", status_code.as_u16(), snippet));
    }

    let payload = serde_json::from_str::<Value>(&raw_text).unwrap_or(Value::String(raw_text));
    parse_translation_payload(&payload, &surface)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_and_blocks_private_or_metadata_hosts() {
        assert!(validate_translation_endpoint("https://ark.cn-beijing.volces.com/api/v3").is_ok());
        assert!(validate_translation_endpoint("http://127.0.0.1:3425/v1").is_ok());
        assert!(validate_translation_endpoint("http://localhost:11434/v1").is_ok());
        assert!(validate_translation_endpoint("http://[::1]:3425/v1").is_ok());

        assert!(validate_translation_endpoint("http://169.254.169.254/latest").is_err());
        assert!(validate_translation_endpoint("http://10.0.0.5/v1").is_err());
        assert!(validate_translation_endpoint("http://192.168.1.5/v1").is_err());
        assert!(validate_translation_endpoint("http://metadata.google.internal/v1").is_err());
        assert!(validate_translation_endpoint("file:///etc/passwd").is_err());

        assert!(is_dedicated_translation_model("doubao-seed-translation-250915"));
        assert!(is_dedicated_translation_model("doubao-translate/doubao-ai"));
        assert!(is_dedicated_translation_model("doubao-translate/volcengine-translate"));
        assert!(is_dedicated_translation_model("doubao-translate/microsoft-translator"));
        assert!(!is_dedicated_translation_model("auto/deepseek-v4.1-flash"));

        assert_eq!(pick_fast_reasoning_effort("auto/deepseek-v4.1-flash"), Some("none"));
        assert_eq!(pick_fast_reasoning_effort("workbuddy-ai/deepseek-v4.1-flash-sg"), Some("none"));
        assert_eq!(pick_fast_reasoning_effort("auto/minimax-m3.1-flash"), Some("low"));
        assert_eq!(pick_fast_reasoning_effort("auto/hy4flash-free"), None);
        assert_eq!(pick_fast_reasoning_effort("doubao-translate/doubao-ai"), None);
    }

    #[test]
    fn parses_models_and_doubao_responses_payload() {
        let models_json = json!({
            "data": [
                { "id": "doubao-seed-translation-250915" },
                { "id": "doubao-1-5-pro-32k" }
            ]
        });
        let models = parse_models_list_payload(&models_json);
        assert_eq!(
            models,
            vec![
                "doubao-1-5-pro-32k".to_string(),
                "doubao-seed-translation-250915".to_string()
            ]
        );

        let doubao_resp = json!({
            "output": [{
                "type": "message",
                "content": [{
                    "type": "output_text",
                    "text": "摊销"
                }]
            }]
        });
        let res = parse_translation_payload(&doubao_resp, "amortization").unwrap();
        assert_eq!(res.meaning_zh, "摊销");
        assert_eq!(res.source, "api");

        let rich_chat_resp = json!({
            "choices": [{
                "message": {
                    "content": "{\"word\":\"stakeholder\",\"phonetic\":\"ˈsteɪkhəʊldə(r)\",\"pos\":\"n.\",\"meaning_zh\":\"利益相关者；干系人\",\"plain_zh\":\"跟企业或项目有利害关系的人（如股东、员工、客户）\",\"alternatives\":[\"股东\",\"利益方\",\"相关方\"],\"synonyms\":[\"shareholder\",\"interested party\",\"stakeholder\"]}"
                }
            }]
        });
        let rich = parse_translation_payload(&rich_chat_resp, "stakeholders").unwrap();
        assert_eq!(rich.word, "stakeholder");
        assert_eq!(
            rich.plain_zh.as_deref(),
            Some("跟企业或项目有利害关系的人（如股东、员工、客户）")
        );
        assert_eq!(rich.alternatives, vec!["股东", "利益方", "相关方"]);
        assert_eq!(rich.synonyms, vec!["shareholder", "interested party"]);
    }
}
