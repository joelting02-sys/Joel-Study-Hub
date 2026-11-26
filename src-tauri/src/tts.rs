use crate::models::{TtsAudioInput, TtsAudioResult};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use std::sync::OnceLock;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const TTS_TIMEOUT_SECS: u64 = 4;
const MIN_AUDIO_BYTES: usize = 256;
const MAX_AUDIO_BYTES: usize = 2_000_000;
const BASE64_TABLE: &[u8; 64] =
    b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

static TTS_HTTP_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

fn tts_http_client() -> Result<&'static reqwest::Client, String> {
    if let Some(client) = TTS_HTTP_CLIENT.get() {
        return Ok(client);
    }
    let built = reqwest::Client::builder()
        .timeout(Duration::from_secs(TTS_TIMEOUT_SECS))
        .pool_max_idle_per_host(2)
        .build()
        .map_err(|e| format!("初始化 TTS 客户端失败: {e}"))?;
    let _ = TTS_HTTP_CLIENT.set(built);
    TTS_HTTP_CLIENT
        .get()
        .ok_or_else(|| "初始化 TTS 客户端失败".to_string())
}

pub fn encode_base64(input: &[u8]) -> String {
    if input.is_empty() {
        return String::new();
    }
    let mut out = String::with_capacity(input.len().div_ceil(3) * 4);
    for chunk in input.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let n = (b0 << 16) | (b1 << 8) | b2;

        out.push(BASE64_TABLE[((n >> 18) & 0x3f) as usize] as char);
        out.push(BASE64_TABLE[((n >> 12) & 0x3f) as usize] as char);
        if chunk.len() > 1 {
            out.push(BASE64_TABLE[((n >> 6) & 0x3f) as usize] as char);
        } else {
            out.push('=');
        }
        if chunk.len() > 2 {
            out.push(BASE64_TABLE[(n & 0x3f) as usize] as char);
        } else {
            out.push('=');
        }
    }
    out
}

pub fn normalize_tts_accent(raw: Option<&str>) -> (&'static str, &'static str) {
    match raw.map(|s| s.trim().to_lowercase()).as_deref() {
        Some("en-gb") | Some("uk") => ("en-GB", "1"),
        _ => ("en-US", "2"),
    }
}

pub fn sanitize_tts_text(raw: &str) -> Result<String, String> {
    let collapsed: String = raw
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(160)
        .collect();
    let trimmed = collapsed.trim().to_string();
    if trimmed.is_empty() {
        return Err("缺少待朗读的英文单词".to_string());
    }
    Ok(trimmed)
}

fn audio_cache_dir() -> PathBuf {
    dirs::cache_dir()
        .or_else(dirs::data_local_dir)
        .unwrap_or_else(std::env::temp_dir)
        .join("StudyHub")
        .join("audio_cache")
}

fn looks_like_audio(content_type: &str, bytes: &[u8]) -> bool {
    let lower = content_type.to_lowercase();
    if lower.contains("audio") || lower.contains("octet-stream") {
        return true;
    }
    if bytes.len() >= 3 && &bytes[..3] == b"ID3" {
        return true;
    }
    bytes.len() >= 2 && bytes[0] == 0xff && (bytes[1] & 0xe0) == 0xe0
}

pub async fn fetch_tts_audio(input: TtsAudioInput) -> Result<TtsAudioResult, String> {
    let cleaned = sanitize_tts_text(&input.text)?;
    let (accent_label, type_param) = normalize_tts_accent(input.accent.as_deref());

    let mut hasher = Sha256::new();
    hasher.update(format!("{accent_label}|{}", cleaned.to_lowercase()).as_bytes());
    let hash_hex = hex::encode(hasher.finalize());

    let cache_dir = audio_cache_dir();
    let cache_path = cache_dir.join(format!("{hash_hex}.mp3"));

    if let Ok(bytes) = fs::read(&cache_path) {
        if bytes.len() > MIN_AUDIO_BYTES && bytes.len() < MAX_AUDIO_BYTES {
            return Ok(TtsAudioResult {
                mime: "audio/mpeg".to_string(),
                audio_base64: encode_base64(&bytes),
                cached: true,
            });
        }
    }

    let url = reqwest::Url::parse_with_params(
        "https://dict.youdao.com/dictvoice",
        &[("audio", cleaned.as_str()), ("type", type_param)],
    )
    .map_err(|e| format!("构造 TTS 请求地址失败: {e}"))?;

    let client = tts_http_client()?;
    let resp = client
        .get(url)
        .header("User-Agent", "StudyHub/1.0")
        .send()
        .await
        .map_err(|e| format!("获取词典发音失败: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("词典发音接口返回 HTTP {}", resp.status().as_u16()));
    }

    let content_type = resp
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("读取发音音频失败: {e}"))?;

    if bytes.len() <= MIN_AUDIO_BYTES
        || bytes.len() >= MAX_AUDIO_BYTES
        || !looks_like_audio(&content_type, &bytes)
    {
        return Err("发音接口返回了无效的音频内容".to_string());
    }

    if fs::create_dir_all(&cache_dir).is_ok() {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let tmp_path = cache_dir.join(format!("{hash_hex}.mp3.tmp.{}.{nanos}", std::process::id()));
        if fs::write(&tmp_path, &bytes).is_ok() {
            if fs::rename(&tmp_path, &cache_path).is_err() {
                let _ = fs::remove_file(&tmp_path);
            }
        }
    }

    Ok(TtsAudioResult {
        mime: "audio/mpeg".to_string(),
        audio_base64: encode_base64(&bytes),
        cached: false,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encodes_rfc4648_base64_correctly() {
        assert_eq!(encode_base64(b""), "");
        assert_eq!(encode_base64(b"M"), "TQ==");
        assert_eq!(encode_base64(b"Ma"), "TWE=");
        assert_eq!(encode_base64(b"Man"), "TWFu");
        assert_eq!(encode_base64(&[0x00, 0xff, 0x10]), "AP8Q");
    }

    #[test]
    fn normalizes_accent_and_sanitizes_text() {
        assert_eq!(normalize_tts_accent(Some("en-GB")), ("en-GB", "1"));
        assert_eq!(normalize_tts_accent(Some("uk")), ("en-GB", "1"));
        assert_eq!(normalize_tts_accent(Some("en-US")), ("en-US", "2"));
        assert_eq!(normalize_tts_accent(None), ("en-US", "2"));

        assert_eq!(
            sanitize_tts_text("  supply   chain  ").unwrap(),
            "supply chain"
        );
        assert!(sanitize_tts_text("   ").is_err());
    }
}
