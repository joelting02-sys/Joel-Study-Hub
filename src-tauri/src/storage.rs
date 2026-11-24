use crate::dictionary::{
    build_dictionary_index, load_builtin_records, lookup_word, DictionaryIndex,
};
use crate::models::{
    AddVocabInput, AddVocabResponse, EcdictRecord, FolderStatus, LookupOptionsInput, LookupResult,
    QuizFile, QuizResultFile, StorageChangeEvent, UpdateVocabPatch, VocabEntry, VocabFile,
    VocabInboxFile, VocabInboxItem,
};
use crate::vocab::{
    add_or_increment_vocab, calculate_next_review, export_vocab_to_markdown, format_today_ymd,
    mark_word_status, merge_inbox_words, normalize_subject,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const AGENT_GUIDE_CONTENT: &str = include_str!("../../AGENT_GUIDE.md");

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SavedConfig {
    data_dir: String,
}

/// 原子写入：先写入同目录 .tmp. 临时文件，再 rename 覆盖目标文件
pub fn atomic_write_file(target_path: &Path, content: &str) -> Result<(), String> {
    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {e}"))?;
    }
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let file_name = target_path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("file");
    let tmp_name = format!("{file_name}.tmp.{}.{nanos}", std::process::id());
    let tmp_path = target_path.with_file_name(tmp_name);

    fs::write(&tmp_path, content.as_bytes()).map_err(|e| format!("写入临时文件失败: {e}"))?;
    if let Err(err) = fs::rename(&tmp_path, target_path) {
        let _ = fs::remove_file(&tmp_path);
        return Err(format!("原子替换文件失败: {err}"));
    }
    Ok(())
}

fn sanitize_filename(raw: &str, fallback: &str, required_ext: &str) -> String {
    let cleaned: String = raw
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-') {
                c
            } else {
                '_'
            }
        })
        .collect();
    let base = if cleaned.trim_matches('_').is_empty() {
        fallback.to_string()
    } else {
        cleaned
    };
    if base.to_lowercase().ends_with(required_ext) {
        base
    } else {
        format!("{base}{required_ext}")
    }
}

pub struct StudyHubStorage {
    data_dir: PathBuf,
    config_path: PathBuf,
    dict_index: DictionaryIndex,
    has_external_ecdict: bool,
    last_synced_at: String,
}

impl StudyHubStorage {
    pub fn new() -> Self {
        let config_path = Self::resolve_config_path();
        let data_dir = Self::resolve_initial_data_dir(&config_path);
        let mut storage = Self {
            data_dir,
            config_path,
            dict_index: build_dictionary_index(load_builtin_records()),
            has_external_ecdict: false,
            last_synced_at: Utc::now().to_rfc3339(),
        };
        storage.initialize_data_dir();
        storage.load_external_dictionary();
        storage
    }

    #[cfg(test)]
    pub fn new_with_dir(data_dir: PathBuf, config_path: PathBuf) -> Self {
        let mut storage = Self {
            data_dir,
            config_path,
            dict_index: build_dictionary_index(load_builtin_records()),
            has_external_ecdict: false,
            last_synced_at: Utc::now().to_rfc3339(),
        };
        storage.initialize_data_dir();
        storage.load_external_dictionary();
        storage
    }

    fn resolve_config_path() -> PathBuf {
        if let Some(cfg) = dirs::config_dir() {
            return cfg.join("StudyHub").join("studyhub-config.json");
        }
        std::env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join("studyhub-config.json")
    }

    pub fn default_windows_dir() -> String {
        if let Some(doc_dir) = dirs::document_dir() {
            return doc_dir.join("StudyHub").to_string_lossy().to_string();
        }
        if let Some(home) = dirs::home_dir() {
            return home
                .join("Documents")
                .join("StudyHub")
                .to_string_lossy()
                .to_string();
        }
        r"C:\Users\joelt\Documents\StudyHub".to_string()
    }

    fn resolve_initial_data_dir(config_path: &Path) -> PathBuf {
        if let Ok(raw) = fs::read_to_string(config_path) {
            if let Ok(cfg) = serde_json::from_str::<SavedConfig>(&raw) {
                let trimmed = cfg.data_dir.trim();
                if !trimmed.is_empty() {
                    return PathBuf::from(trimmed);
                }
            }
        }
        if let Ok(env_dir) = std::env::var("STUDYHUB_DATA_DIR") {
            if !env_dir.trim().is_empty() {
                return PathBuf::from(env_dir.trim());
            }
        }
        PathBuf::from(Self::default_windows_dir())
    }

    pub fn data_dir(&self) -> &Path {
        &self.data_dir
    }

    pub fn watch_dirs(&self) -> (PathBuf, PathBuf, PathBuf) {
        (
            self.data_dir.join("quizzes"),
            self.data_dir.join("vocab_inbox"),
            self.data_dir.join("dict"),
        )
    }

    pub fn touch_synced(&mut self) {
        self.last_synced_at = Utc::now().to_rfc3339();
    }

    fn initialize_data_dir(&mut self) {
        let subdirs = ["vocab_inbox", "quizzes", "results", "dict", "exports"];
        let _ = fs::create_dir_all(&self.data_dir);
        for sub in subdirs {
            let _ = fs::create_dir_all(self.data_dir.join(sub));
        }

        let vocab_path = self.data_dir.join("vocab.json");
        if !vocab_path.exists() {
            let _ = self.write_vocab_file(&VocabFile {
                version: 1,
                words: Vec::new(),
            });
        } else {
            let export_path = self.data_dir.join("exports").join("单词库.md");
            if !export_path.exists() {
                let current = self.read_vocab_file();
                let _ = self.export_markdown(Some(&current.words));
            }
        }

        let guide_path = self.data_dir.join("AGENT_GUIDE.md");
        if !guide_path.exists() {
            let _ = atomic_write_file(&guide_path, AGENT_GUIDE_CONTENT);
        }

        self.process_all_inbox_files();
    }

    pub fn set_data_dir(&mut self, new_dir: &str) -> Result<FolderStatus, String> {
        let trimmed = new_dir.trim();
        if trimmed.is_empty() {
            return Err("数据目录路径不能为空".to_string());
        }
        let target = PathBuf::from(trimmed);
        fs::create_dir_all(&target).map_err(|e| format!("无法创建目标目录: {e}"))?;
        let canonical = fs::canonicalize(&target).unwrap_or(target);
        // 去掉 Windows 扩展路径前缀 \\?\，保持路径整洁可读
        let clean_str = canonical
            .to_string_lossy()
            .trim_start_matches(r"\\?\")
            .to_string();
        self.data_dir = PathBuf::from(&clean_str);

        let cfg = SavedConfig {
            data_dir: clean_str,
        };
        if let Ok(json) = serde_json::to_string_pretty(&cfg) {
            let _ = atomic_write_file(&self.config_path, &json);
        }

        self.initialize_data_dir();
        self.load_external_dictionary();
        self.touch_synced();
        Ok(self.get_status())
    }

    pub fn load_external_dictionary(&mut self) {
        let dict_dir = self.data_dir.join("dict");
        let mut records = load_builtin_records();
        let mut loaded_external = false;

        if let Ok(entries) = fs::read_dir(&dict_dir) {
            let mut json_file: Option<PathBuf> = None;
            let mut csv_file: Option<PathBuf> = None;
            for entry in entries.flatten() {
                let path = entry.path();
                if !path.is_file() {
                    continue;
                }
                let lower = path
                    .file_name()
                    .and_then(|s| s.to_str())
                    .unwrap_or("")
                    .to_lowercase();
                if lower.contains(".tmp.") {
                    continue;
                }
                if json_file.is_none() && lower.ends_with(".json") {
                    json_file = Some(path);
                } else if csv_file.is_none() && lower.ends_with(".csv") {
                    csv_file = Some(path);
                }
            }

            if let Some(jf) = json_file {
                if let Ok(raw) = fs::read_to_string(&jf) {
                    if let Ok(arr) = serde_json::from_str::<Vec<serde_json::Value>>(&raw) {
                        for item in arr {
                            if let Some(word) = item.get("word").and_then(|v| v.as_str()) {
                                let translation = item
                                    .get("translation")
                                    .or_else(|| item.get("meaning_zh"))
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("")
                                    .to_string();
                                records.push(EcdictRecord {
                                    word: word.to_string(),
                                    phonetic: item
                                        .get("phonetic")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("")
                                        .to_string(),
                                    pos: item
                                        .get("pos")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("")
                                        .to_string(),
                                    translation,
                                    exchange: item
                                        .get("exchange")
                                        .and_then(|v| v.as_str())
                                        .unwrap_or("")
                                        .to_string(),
                                });
                            }
                        }
                        loaded_external = true;
                    }
                }
            }

            if let Some(cf) = csv_file {
                if let Ok(mut rdr) = csv::ReaderBuilder::new().flexible(true).from_path(&cf) {
                    let lower_headers: Vec<String> = rdr
                        .headers()
                        .ok()
                        .map(|headers| headers.iter().map(|h| h.trim().to_lowercase()).collect())
                        .unwrap_or_default();

                    let word_idx = lower_headers.iter().position(|h| h == "word");
                    let phonetic_idx = lower_headers.iter().position(|h| h == "phonetic");
                    let trans_idx = lower_headers.iter().position(|h| h == "translation");
                    let pos_idx = lower_headers.iter().position(|h| h == "pos");
                    let exchange_idx = lower_headers.iter().position(|h| h == "exchange");

                    if let (Some(wi), Some(ti)) = (word_idx, trans_idx) {
                        for result in rdr.records().flatten() {
                            let word = result.get(wi).unwrap_or("").trim();
                            let translation = result.get(ti).unwrap_or("").trim();
                            if word.is_empty() || translation.is_empty() {
                                continue;
                            }
                            records.push(EcdictRecord {
                                word: word.to_string(),
                                phonetic: phonetic_idx
                                    .and_then(|i| result.get(i))
                                    .unwrap_or("")
                                    .trim()
                                    .to_string(),
                                pos: pos_idx
                                    .and_then(|i| result.get(i))
                                    .unwrap_or("")
                                    .trim()
                                    .to_string(),
                                translation: translation.to_string(),
                                exchange: exchange_idx
                                    .and_then(|i| result.get(i))
                                    .unwrap_or("")
                                    .trim()
                                    .to_string(),
                            });
                        }
                        loaded_external = true;
                    }
                }
            }
        }

        self.dict_index = build_dictionary_index(records);
        self.has_external_ecdict = loaded_external;
        self.touch_synced();
    }

    pub fn save_external_dict_csv(
        &mut self,
        filename: &str,
        csv_content: &str,
    ) -> Result<(FolderStatus, StorageChangeEvent), String> {
        let final_name = sanitize_filename(filename, "ecdict.csv", ".csv");
        atomic_write_file(&self.data_dir.join("dict").join(&final_name), csv_content)?;
        self.load_external_dictionary();
        let evt = StorageChangeEvent {
            event_type: "dict_updated".to_string(),
            message: Some(format!("已导入离线词典 {final_name}")),
            added_count: None,
        };
        Ok((self.get_status(), evt))
    }

    pub fn lookup(&self, surface: &str, options: &LookupOptionsInput) -> LookupResult {
        lookup_word(surface, options, &self.dict_index)
    }

    // ==================== Vocab 读写 ====================

    pub fn read_vocab_file(&self) -> VocabFile {
        let vocab_path = self.data_dir.join("vocab.json");
        if let Ok(raw) = fs::read_to_string(&vocab_path) {
            if let Ok(parsed) = serde_json::from_str::<VocabFile>(&raw) {
                return VocabFile {
                    version: 1,
                    words: parsed.words,
                };
            }
        }
        VocabFile {
            version: 1,
            words: Vec::new(),
        }
    }

    fn write_vocab_file(&self, vocab: &VocabFile) -> Result<(), String> {
        let json = serde_json::to_string_pretty(vocab)
            .map_err(|e| format!("序列化 vocab.json 失败: {e}"))?;
        atomic_write_file(&self.data_dir.join("vocab.json"), &json)?;
        self.export_markdown(Some(&vocab.words))?;
        Ok(())
    }

    pub fn export_markdown(&self, words: Option<&[VocabEntry]>) -> Result<(String, String), String> {
        let owned;
        let slice = match words {
            Some(w) => w,
            None => {
                owned = self.read_vocab_file().words;
                &owned
            }
        };
        let md = export_vocab_to_markdown(slice);
        let export_path = self.data_dir.join("exports").join("单词库.md");
        atomic_write_file(&export_path, &md)?;
        Ok((md, export_path.to_string_lossy().to_string()))
    }

    pub fn add_vocab(&mut self, input: &AddVocabInput) -> Result<AddVocabResponse, String> {
        let current = self.read_vocab_file();
        let today = format_today_ymd();
        let now_iso = Utc::now().to_rfc3339();
        let (words, entry, is_new) = add_or_increment_vocab(current.words, input, &today, &now_iso);
        let updated = VocabFile { version: 1, words };
        self.write_vocab_file(&updated)?;
        self.touch_synced();
        Ok(AddVocabResponse {
            entry,
            is_new,
            vocab: updated,
        })
    }

    pub fn update_vocab(
        &mut self,
        id: &str,
        patch: &UpdateVocabPatch,
    ) -> Result<VocabFile, String> {
        let mut current = self.read_vocab_file();
        if let Some(status) = patch.status.as_deref() {
            mark_word_status(&mut current.words, id, status);
        }
        for w in current.words.iter_mut() {
            if w.id == id {
                if let Some(m) = &patch.meaning_zh {
                    w.meaning_zh = m.trim().to_string();
                }
                if let Some(s) = &patch.subject {
                    w.subject = normalize_subject(Some(s));
                }
                if let Some(c) = &patch.context {
                    w.context = c.trim().to_string();
                }
            }
        }
        self.write_vocab_file(&current)?;
        self.touch_synced();
        Ok(current)
    }

    pub fn delete_vocab(&mut self, id: &str) -> Result<VocabFile, String> {
        let mut current = self.read_vocab_file();
        current.words.retain(|w| w.id != id);
        self.write_vocab_file(&current)?;
        self.touch_synced();
        Ok(current)
    }

    pub fn record_review(&mut self, id: &str, remembered: bool) -> Result<VocabFile, String> {
        let mut current = self.read_vocab_file();
        let today = format_today_ymd();
        for w in current.words.iter_mut() {
            if w.id == id {
                w.review = calculate_next_review(w.review.interval_days, remembered, &today);
            }
        }
        self.write_vocab_file(&current)?;
        self.touch_synced();
        Ok(current)
    }

    // ==================== vocab_inbox 合并 ====================

    fn process_all_inbox_files(&mut self) {
        let inbox_dir = self.data_dir.join("vocab_inbox");
        let Ok(entries) = fs::read_dir(&inbox_dir) else {
            return;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            let name = path
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_lowercase();
            if path.is_file() && name.ends_with(".json") && !name.contains(".tmp.") {
                let _ = self.process_single_inbox_file(&path);
            }
        }
    }

    pub fn process_single_inbox_file(&mut self, file_path: &Path) -> Option<StorageChangeEvent> {
        if !file_path.exists() {
            return None;
        }
        let raw = fs::read_to_string(file_path).ok()?;
        let inbox_words: Vec<VocabInboxItem> =
            if let Ok(file) = serde_json::from_str::<VocabInboxFile>(&raw) {
                file.words
            } else if let Ok(arr) = serde_json::from_str::<Vec<VocabInboxItem>>(&raw) {
                arr
            } else {
                return None;
            };

        let current = self.read_vocab_file();
        let today = format_today_ymd();
        let now_iso = Utc::now().to_rfc3339();
        let (merged_words, added_count) =
            merge_inbox_words(current.words, &inbox_words, &today, &now_iso);
        if added_count > 0 {
            let _ = self.write_vocab_file(&VocabFile {
                version: 1,
                words: merged_words,
            });
        }
        let _ = fs::remove_file(file_path);
        self.touch_synced();
        Some(StorageChangeEvent {
            event_type: "inbox_merged".to_string(),
            message: Some(format!("已从 vocab_inbox 合并 {added_count} 个新单词")),
            added_count: Some(added_count),
        })
    }

    pub fn drop_inbox_file(
        &mut self,
        filename: &str,
        content: &VocabInboxFile,
    ) -> Result<(usize, VocabFile, Option<StorageChangeEvent>), String> {
        let final_name = sanitize_filename(filename, "inbox.json", ".json");
        let file_path = self.data_dir.join("vocab_inbox").join(&final_name);
        let json = serde_json::to_string_pretty(content)
            .map_err(|e| format!("序列化 vocab_inbox 失败: {e}"))?;
        atomic_write_file(&file_path, &json)?;
        let evt = self.process_single_inbox_file(&file_path);
        let added = evt.as_ref().and_then(|e| e.added_count).unwrap_or(0);
        Ok((added, self.read_vocab_file(), evt))
    }

    // ==================== Quizzes & Results ====================

    fn normalize_quiz(mut raw: QuizFile, filename: String) -> QuizFile {
        if raw.title.trim().is_empty() {
            raw.title = raw.quiz_id.clone();
        }
        raw.subject = normalize_subject(Some(&raw.subject));
        if raw.pass_rate <= 0.0 || raw.pass_rate > 100.0 {
            raw.pass_rate = 80.0;
        }
        for (idx, q) in raw.questions.iter_mut().enumerate() {
            if q.id.trim().is_empty() {
                q.id = format!("q{}", idx + 1);
            }
            if q.options.is_empty() {
                q.options = vec!["True".to_string(), "False".to_string()];
            }
            if q.question_type != "true_false" && q.question_type != "multiple_choice" {
                q.question_type = if q.options.len() == 2 {
                    "true_false".to_string()
                } else {
                    "multiple_choice".to_string()
                };
            }
        }
        raw.filename = Some(filename);
        raw
    }

    pub fn list_quizzes(&self) -> Vec<QuizFile> {
        let quizzes_dir = self.data_dir.join("quizzes");
        let Ok(entries) = fs::read_dir(&quizzes_dir) else {
            return Vec::new();
        };

        let mut files: Vec<String> = entries
            .flatten()
            .filter_map(|e| {
                let p = e.path();
                if !p.is_file() {
                    return None;
                }
                let name = p.file_name()?.to_str()?.to_string();
                let lower = name.to_lowercase();
                if lower.ends_with(".json") && !lower.contains(".tmp.") {
                    Some(name)
                } else {
                    None
                }
            })
            .collect();
        files.sort();

        let mut quizzes = Vec::new();
        for f in files {
            if let Ok(raw) = fs::read_to_string(quizzes_dir.join(&f)) {
                if let Ok(parsed) = serde_json::from_str::<QuizFile>(&raw) {
                    if !parsed.quiz_id.is_empty() && !parsed.questions.is_empty() {
                        quizzes.push(Self::normalize_quiz(parsed, f));
                    }
                }
            }
        }
        quizzes
    }

    pub fn import_quiz(
        &mut self,
        filename: &str,
        quiz: QuizFile,
    ) -> Result<(QuizFile, Vec<QuizFile>, StorageChangeEvent), String> {
        if quiz.quiz_id.trim().is_empty() || quiz.questions.is_empty() {
            return Err("测验 JSON 格式无效：需要包含 quiz_id 和非空的 questions 数组".to_string());
        }
        let fallback = format!("{}.json", quiz.quiz_id);
        let final_name = sanitize_filename(filename, &fallback, ".json");
        let normalized = Self::normalize_quiz(quiz, final_name.clone());
        let mut clean = normalized.clone();
        clean.filename = None;
        let json = serde_json::to_string_pretty(&clean)
            .map_err(|e| format!("序列化测验失败: {e}"))?;
        atomic_write_file(&self.data_dir.join("quizzes").join(&final_name), &json)?;
        self.touch_synced();
        let evt = StorageChangeEvent {
            event_type: "quizzes_updated".to_string(),
            message: Some(format!("已导入测验：{}", normalized.title)),
            added_count: None,
        };
        Ok((normalized, self.list_quizzes(), evt))
    }

    pub fn save_quiz_result(
        &mut self,
        filename: &str,
        mut result: QuizResultFile,
    ) -> Result<(QuizResultFile, StorageChangeEvent), String> {
        let final_name = sanitize_filename(filename, "result.json", ".json");
        result.filename = None;
        let json = serde_json::to_string_pretty(&result)
            .map_err(|e| format!("序列化测验结果失败: {e}"))?;
        atomic_write_file(&self.data_dir.join("results").join(&final_name), &json)?;
        result.filename = Some(final_name.clone());
        self.touch_synced();
        let evt = StorageChangeEvent {
            event_type: "results_updated".to_string(),
            message: Some(format!("测验结果已保存：{final_name}")),
            added_count: None,
        };
        Ok((result, evt))
    }

    pub fn list_results(&self) -> Vec<QuizResultFile> {
        let results_dir = self.data_dir.join("results");
        let Ok(entries) = fs::read_dir(&results_dir) else {
            return Vec::new();
        };

        let mut files: Vec<String> = entries
            .flatten()
            .filter_map(|e| {
                let p = e.path();
                if !p.is_file() {
                    return None;
                }
                let name = p.file_name()?.to_str()?.to_string();
                let lower = name.to_lowercase();
                if lower.ends_with(".json") && !lower.contains(".tmp.") {
                    Some(name)
                } else {
                    None
                }
            })
            .collect();
        files.sort();
        files.reverse();

        let mut results = Vec::new();
        for f in files.into_iter().take(50) {
            if let Ok(raw) = fs::read_to_string(results_dir.join(&f)) {
                if let Ok(mut parsed) = serde_json::from_str::<QuizResultFile>(&raw) {
                    if !parsed.quiz_id.is_empty() {
                        parsed.filename = Some(f);
                        results.push(parsed);
                    }
                }
            }
        }
        results
    }

    pub fn get_status(&self) -> FolderStatus {
        let vocab = self.read_vocab_file();
        let learning_count = vocab.words.iter().filter(|w| w.status == "learning").count();
        let learned_count = vocab.words.iter().filter(|w| w.status == "learned").count();
        let quizzes = self.list_quizzes();
        let results = self.list_results();
        let export_path = self.data_dir.join("exports").join("单词库.md");

        FolderStatus {
            data_dir: self.data_dir.to_string_lossy().to_string(),
            default_windows_dir: Self::default_windows_dir(),
            platform: std::env::consts::OS.to_string(),
            vocab_count: vocab.words.len(),
            learning_count,
            learned_count,
            quiz_count: quizzes.len(),
            result_count: results.len(),
            ecdict_entries_count: self.dict_index.by_word.len(),
            has_external_ecdict: self.has_external_ecdict,
            export_exists: export_path.exists(),
            export_path: export_path.to_string_lossy().to_string(),
            last_synced_at: self.last_synced_at.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::QuizQuestion;
    use tempfile::tempdir;

    #[test]
    fn fresh_data_dir_starts_blank_and_handles_agent_protocol() {
        let tmp = tempdir().unwrap();
        let data_dir = tmp.path().join("StudyHub");
        let cfg_path = tmp.path().join("config.json");

        let mut store = StudyHubStorage::new_with_dir(data_dir.clone(), cfg_path);
        assert_eq!(store.read_vocab_file().words.len(), 0);
        assert_eq!(store.list_quizzes().len(), 0);
        assert_eq!(store.list_results().len(), 0);
        assert!(data_dir.join("AGENT_GUIDE.md").exists());

        // Agent drops a quiz
        let quiz = QuizFile {
            quiz_id: "rust-parity-q1".to_string(),
            title: "Rust Parity Quiz".to_string(),
            subject: "ICT".to_string(),
            pass_rate: 80.0,
            glossary: Default::default(),
            questions: vec![QuizQuestion {
                id: "q1".to_string(),
                question_type: String::new(),
                stem: "Rust storage maintains parity?".to_string(),
                options: vec!["True".to_string(), "False".to_string()],
                correct_index: 0,
                explanation_zh: "完全兼容".to_string(),
                hint: None,
                source: None,
            }],
            filename: None,
        };
        let (saved, list, _) = store.import_quiz("rust-parity-q1.json", quiz).unwrap();
        assert_eq!(saved.questions[0].question_type, "true_false");
        assert_eq!(list.len(), 1);

        // Agent drops inbox batch -> merged & deleted
        let (added, vocab, _) = store
            .drop_inbox_file(
                "batch.json",
                &VocabInboxFile {
                    words: vec![VocabInboxItem {
                        word: "throughput".to_string(),
                        meaning_zh: Some("吞吐量".to_string()),
                        phonetic: None,
                        pos: None,
                        context: None,
                        source: None,
                        subject: Some("ICT".to_string()),
                    }],
                },
            )
            .unwrap();
        assert_eq!(added, 1);
        assert_eq!(vocab.words.len(), 1);
        assert!(!data_dir.join("vocab_inbox").join("batch.json").exists());
    }
}
