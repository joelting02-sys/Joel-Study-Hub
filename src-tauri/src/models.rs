use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct VocabReview {
    pub next_review: String,
    pub interval_days: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VocabEntry {
    pub id: String,
    pub word: String,
    #[serde(default)]
    pub meaning_zh: String,
    #[serde(default)]
    pub phonetic: String,
    #[serde(default)]
    pub pos: String,
    #[serde(default)]
    pub context: String,
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub subject: String,
    #[serde(default = "default_status_learning")]
    pub status: String,
    #[serde(default)]
    pub added_at: String,
    #[serde(default)]
    pub learned_at: Option<String>,
    #[serde(default = "default_lookup_count")]
    pub lookup_count: u64,
    pub review: VocabReview,
}

fn default_status_learning() -> String {
    "learning".to_string()
}

fn default_lookup_count() -> u64 {
    1
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VocabFile {
    #[serde(default = "default_vocab_version")]
    pub version: u32,
    #[serde(default)]
    pub words: Vec<VocabEntry>,
}

fn default_vocab_version() -> u32 {
    1
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddVocabInput {
    pub word: String,
    #[serde(default)]
    pub meaning_zh: String,
    #[serde(default)]
    pub phonetic: Option<String>,
    #[serde(default)]
    pub pos: Option<String>,
    #[serde(default)]
    pub context: Option<String>,
    #[serde(default)]
    pub source: Option<String>,
    #[serde(default)]
    pub subject: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateVocabPatch {
    #[serde(default)]
    pub meaning_zh: Option<String>,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub subject: Option<String>,
    #[serde(default)]
    pub context: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VocabInboxItem {
    pub word: String,
    #[serde(default)]
    pub meaning_zh: Option<String>,
    #[serde(default)]
    pub phonetic: Option<String>,
    #[serde(default)]
    pub pos: Option<String>,
    #[serde(default)]
    pub context: Option<String>,
    #[serde(default)]
    pub source: Option<String>,
    #[serde(default)]
    pub subject: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VocabInboxFile {
    #[serde(default)]
    pub words: Vec<VocabInboxItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddVocabResponse {
    pub entry: VocabEntry,
    pub is_new: bool,
    pub vocab: VocabFile,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportInboxResponse {
    pub added_count: usize,
    pub vocab: VocabFile,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportMarkdownResponse {
    pub markdown: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuizQuestion {
    #[serde(default)]
    pub id: String,
    #[serde(rename = "type", default)]
    pub question_type: String,
    #[serde(default)]
    pub stem: String,
    #[serde(default)]
    pub options: Vec<String>,
    #[serde(default)]
    pub correct_index: usize,
    #[serde(default)]
    pub explanation_zh: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hint: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuizFile {
    pub quiz_id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub subject: String,
    #[serde(default = "default_pass_rate")]
    pub pass_rate: f64,
    #[serde(default)]
    pub glossary: HashMap<String, String>,
    #[serde(default)]
    pub questions: Vec<QuizQuestion>,
    #[serde(rename = "_filename", default, skip_serializing_if = "Option::is_none")]
    pub filename: Option<String>,
}

fn default_pass_rate() -> f64 {
    80.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuizzesResponse {
    pub quizzes: Vec<QuizFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportQuizResponse {
    pub quiz: QuizFile,
    pub quizzes: Vec<QuizFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuizAnswerRecord {
    pub id: String,
    pub chosen_index: i32,
    pub correct: bool,
    pub used_hint: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuizResultFile {
    pub quiz_id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub subject: String,
    #[serde(default)]
    pub finished_at: String,
    #[serde(default)]
    pub score: usize,
    #[serde(default)]
    pub total: usize,
    #[serde(default)]
    pub percent: f64,
    #[serde(default)]
    pub answers: Vec<QuizAnswerRecord>,
    #[serde(default)]
    pub words_looked_up: Vec<String>,
    #[serde(rename = "_filename", default, skip_serializing_if = "Option::is_none")]
    pub filename: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResultsResponse {
    pub results: Vec<QuizResultFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveResultResponse {
    pub result: QuizResultFile,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EcdictRecord {
    pub word: String,
    #[serde(default)]
    pub phonetic: String,
    #[serde(default)]
    pub pos: String,
    #[serde(default)]
    pub translation: String,
    #[serde(default)]
    pub exchange: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LookupOptionsInput {
    #[serde(default)]
    pub glossary: Option<HashMap<String, String>>,
    #[serde(default)]
    pub matched_glossary_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LookupResult {
    pub word: String,
    pub surface: String,
    pub phonetic: String,
    pub pos: String,
    pub meaning_zh: String,
    pub source: String,
    #[serde(rename = "lemmaNote", skip_serializing_if = "Option::is_none")]
    pub lemma_note: Option<String>,
    pub found: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranslationApiStatus {
    pub configured: bool,
    pub base_url: String,
    pub model: String,
    pub endpoint_host: String,
    pub has_api_key: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_key_preview: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveTranslationConfigInput {
    pub base_url: String,
    #[serde(default)]
    pub api_key: Option<String>,
    #[serde(default)]
    pub clear_api_key: bool,
    #[serde(default)]
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct FetchModelsInput {
    #[serde(default)]
    pub base_url: Option<String>,
    #[serde(default)]
    pub api_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchModelsResult {
    pub models: Vec<String>,
    pub count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranslateWordInput {
    pub surface: String,
    #[serde(default)]
    pub sentence: Option<String>,
    #[serde(default)]
    pub subject: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderStatus {
    pub data_dir: String,
    pub default_windows_dir: String,
    pub platform: String,
    pub vocab_count: usize,
    pub learning_count: usize,
    pub learned_count: usize,
    pub quiz_count: usize,
    pub result_count: usize,
    pub ecdict_entries_count: usize,
    pub has_external_ecdict: bool,
    pub export_exists: bool,
    pub export_path: String,
    pub last_synced_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PickDataDirResponse {
    pub canceled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<FolderStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionResult {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageChangeEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub added_count: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdateState {
    pub current_version: String,
    pub is_packaged: bool,
    pub is_portable: bool,
    pub supported: bool,
    pub phase: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub percent: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transferred: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bytes_per_second: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repo_url: Option<String>,
}
