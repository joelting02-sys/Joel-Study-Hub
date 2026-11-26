pub mod dictionary;
pub mod models;
pub mod storage;
pub mod translator;
pub mod tts;
pub mod updater;
pub mod vocab;

use models::{
    ActionResult, AddVocabInput, AddVocabResponse, AppUpdateState, ExportMarkdownResponse,
    FetchModelsInput, FetchModelsResult, FolderStatus, ImportInboxResponse, ImportQuizResponse,
    LookupOptionsInput, LookupResult, PickDataDirResponse, QuizFile, QuizResultFile,
    QuizzesResponse, ResultsResponse, SaveResultResponse, SaveTranslationConfigInput,
    StorageChangeEvent, TranslateWordInput, TranslationApiStatus, TtsAudioInput, TtsAudioResult,
    UpdateVocabPatch, VocabFile, VocabInboxFile,
};
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use storage::StudyHubStorage;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;
use updater::UpdaterManager;

struct AppState {
    storage: Arc<Mutex<StudyHubStorage>>,
    watcher: Mutex<Option<RecommendedWatcher>>,
    updater: Arc<UpdaterManager>,
}

fn emit_storage_event(app: &AppHandle, event: StorageChangeEvent) {
    let _ = app.emit("studyhub:event", event);
}

fn restart_watcher(
    app: &AppHandle,
    storage: &Arc<Mutex<StudyHubStorage>>,
    watcher_slot: &Mutex<Option<RecommendedWatcher>>,
) {
    let (quizzes_dir, inbox_dir, dict_dir) = {
        let guard = storage.lock().unwrap();
        guard.watch_dirs()
    };

    let app_handle = app.clone();
    let storage_ref = Arc::clone(storage);
    let last_quiz_emit = Arc::new(Mutex::new(Instant::now() - Duration::from_secs(10)));
    let last_dict_emit = Arc::new(Mutex::new(Instant::now() - Duration::from_secs(10)));

    let quizzes_watch = quizzes_dir.clone();
    let inbox_watch = inbox_dir.clone();
    let dict_watch = dict_dir.clone();

    let watcher_res = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
        let Ok(event) = res else {
            return;
        };
        if matches!(event.kind, EventKind::Access(_)) {
            return;
        }
        for path in event.paths {
            handle_fs_event(
                &path,
                &quizzes_dir,
                &inbox_dir,
                &dict_dir,
                &storage_ref,
                &app_handle,
                &last_quiz_emit,
                &last_dict_emit,
            );
        }
    });

    if let Ok(mut watcher) = watcher_res {
        let _ = watcher.watch(&quizzes_watch, RecursiveMode::NonRecursive);
        let _ = watcher.watch(&inbox_watch, RecursiveMode::NonRecursive);
        let _ = watcher.watch(&dict_watch, RecursiveMode::NonRecursive);
        let mut slot = watcher_slot.lock().unwrap();
        *slot = Some(watcher);
    }
}

#[allow(clippy::too_many_arguments)]
fn handle_fs_event(
    path: &Path,
    quizzes_dir: &Path,
    inbox_dir: &Path,
    dict_dir: &Path,
    storage: &Arc<Mutex<StudyHubStorage>>,
    app: &AppHandle,
    last_quiz_emit: &Arc<Mutex<Instant>>,
    last_dict_emit: &Arc<Mutex<Instant>>,
) {
    let lower = path.to_string_lossy().to_lowercase();
    if lower.contains(".tmp.") {
        return;
    }

    if path.starts_with(inbox_dir) && lower.ends_with(".json") && path.exists() {
        // 轻微等待外部 Agent 完成写入落盘
        std::thread::sleep(Duration::from_millis(120));
        let evt = {
            let mut guard = storage.lock().unwrap();
            guard.process_single_inbox_file(path)
        };
        if let Some(e) = evt {
            emit_storage_event(app, e);
        }
    } else if path.starts_with(quizzes_dir) && lower.ends_with(".json") {
        let mut last = last_quiz_emit.lock().unwrap();
        if last.elapsed() >= Duration::from_millis(250) {
            *last = Instant::now();
            if let Ok(mut guard) = storage.lock() {
                guard.touch_synced();
            }
            emit_storage_event(
                app,
                StorageChangeEvent {
                    event_type: "quizzes_updated".to_string(),
                    message: Some("检测到测验文件更新".to_string()),
                    added_count: None,
                },
            );
        }
    } else if path.starts_with(dict_dir) && (lower.ends_with(".csv") || lower.ends_with(".json")) {
        let mut last = last_dict_emit.lock().unwrap();
        if last.elapsed() >= Duration::from_millis(400) {
            *last = Instant::now();
            if let Ok(mut guard) = storage.lock() {
                guard.load_external_dictionary();
            }
            emit_storage_event(
                app,
                StorageChangeEvent {
                    event_type: "dict_updated".to_string(),
                    message: Some("离线词典已重载".to_string()),
                    added_count: None,
                },
            );
        }
    }
}

// ==================== Tauri Commands ====================

#[tauri::command]
fn get_status(state: State<'_, AppState>) -> FolderStatus {
    state.storage.lock().unwrap().get_status()
}

#[tauri::command]
fn set_data_dir(
    app: AppHandle,
    state: State<'_, AppState>,
    data_dir: String,
) -> Result<FolderStatus, String> {
    let status = state.storage.lock().unwrap().set_data_dir(&data_dir)?;
    restart_watcher(&app, &state.storage, &state.watcher);
    emit_storage_event(
        &app,
        StorageChangeEvent {
            event_type: "vocab_updated".to_string(),
            message: Some("已切换数据目录".to_string()),
            added_count: None,
        },
    );
    emit_storage_event(
        &app,
        StorageChangeEvent {
            event_type: "quizzes_updated".to_string(),
            message: None,
            added_count: None,
        },
    );
    Ok(status)
}

#[tauri::command]
async fn pick_data_dir(app: AppHandle) -> Result<PickDataDirResponse, String> {
    let current_dir = {
        let state = app.state::<AppState>();
        let guard = state.storage.lock().unwrap();
        guard.data_dir().to_path_buf()
    };
    let app_clone = app.clone();
    let picked = tauri::async_runtime::spawn_blocking(move || {
        app_clone
            .dialog()
            .file()
            .set_title("选择 StudyHub 数据文件夹")
            .set_directory(&current_dir)
            .blocking_pick_folder()
    })
    .await
    .map_err(|e| format!("打开系统文件夹选择框失败: {e}"))?;

    let state = app.state::<AppState>();
    let Some(file_path) = picked else {
        let status = state.storage.lock().unwrap().get_status();
        return Ok(PickDataDirResponse {
            canceled: true,
            status: Some(status),
        });
    };

    let selected_path = file_path
        .into_path()
        .map_err(|e| format!("解析文件夹路径失败: {e}"))?;
    let status = state
        .storage
        .lock()
        .unwrap()
        .set_data_dir(&selected_path.to_string_lossy())?;
    restart_watcher(&app, &state.storage, &state.watcher);

    Ok(PickDataDirResponse {
        canceled: false,
        status: Some(status),
    })
}

#[tauri::command]
fn open_data_dir(app: AppHandle, state: State<'_, AppState>) -> ActionResult {
    let dir = state
        .storage
        .lock()
        .unwrap()
        .data_dir()
        .to_string_lossy()
        .to_string();
    match app.opener().open_path(dir, None::<&str>) {
        Ok(_) => ActionResult {
            ok: true,
            error: None,
        },
        Err(err) => ActionResult {
            ok: false,
            error: Some(err.to_string()),
        },
    }
}

#[tauri::command]
fn get_vocab(state: State<'_, AppState>) -> VocabFile {
    state.storage.lock().unwrap().read_vocab_file()
}

#[tauri::command]
fn add_vocab(
    app: AppHandle,
    state: State<'_, AppState>,
    payload: AddVocabInput,
) -> Result<AddVocabResponse, String> {
    let res = state.storage.lock().unwrap().add_vocab(&payload)?;
    emit_storage_event(
        &app,
        StorageChangeEvent {
            event_type: "vocab_updated".to_string(),
            message: None,
            added_count: None,
        },
    );
    Ok(res)
}

#[tauri::command]
fn update_vocab(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
    patch: UpdateVocabPatch,
) -> Result<VocabFile, String> {
    let updated = state.storage.lock().unwrap().update_vocab(&id, &patch)?;
    emit_storage_event(
        &app,
        StorageChangeEvent {
            event_type: "vocab_updated".to_string(),
            message: None,
            added_count: None,
        },
    );
    Ok(updated)
}

#[tauri::command]
fn delete_vocab(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<VocabFile, String> {
    let updated = state.storage.lock().unwrap().delete_vocab(&id)?;
    emit_storage_event(
        &app,
        StorageChangeEvent {
            event_type: "vocab_updated".to_string(),
            message: None,
            added_count: None,
        },
    );
    Ok(updated)
}

#[tauri::command]
fn record_review(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
    remembered: bool,
) -> Result<VocabFile, String> {
    let updated = state
        .storage
        .lock()
        .unwrap()
        .record_review(&id, remembered)?;
    emit_storage_event(
        &app,
        StorageChangeEvent {
            event_type: "vocab_updated".to_string(),
            message: None,
            added_count: None,
        },
    );
    Ok(updated)
}

#[tauri::command]
fn export_markdown(state: State<'_, AppState>) -> Result<ExportMarkdownResponse, String> {
    let (markdown, path) = state.storage.lock().unwrap().export_markdown(None)?;
    Ok(ExportMarkdownResponse { markdown, path })
}

#[tauri::command]
fn import_inbox(
    app: AppHandle,
    state: State<'_, AppState>,
    filename: String,
    data: VocabInboxFile,
) -> Result<ImportInboxResponse, String> {
    let (added_count, vocab, evt) = state
        .storage
        .lock()
        .unwrap()
        .drop_inbox_file(&filename, &data)?;
    if let Some(e) = evt {
        emit_storage_event(&app, e);
    }
    Ok(ImportInboxResponse { added_count, vocab })
}

#[tauri::command]
fn get_quizzes(state: State<'_, AppState>) -> QuizzesResponse {
    QuizzesResponse {
        quizzes: state.storage.lock().unwrap().list_quizzes(),
    }
}

#[tauri::command]
fn import_quiz(
    app: AppHandle,
    state: State<'_, AppState>,
    filename: String,
    quiz: QuizFile,
) -> Result<ImportQuizResponse, String> {
    let (saved, quizzes, evt) = state
        .storage
        .lock()
        .unwrap()
        .import_quiz(&filename, quiz)?;
    emit_storage_event(&app, evt);
    Ok(ImportQuizResponse {
        quiz: saved,
        quizzes,
    })
}

#[tauri::command]
fn get_results(state: State<'_, AppState>) -> ResultsResponse {
    ResultsResponse {
        results: state.storage.lock().unwrap().list_results(),
    }
}

#[tauri::command]
fn save_result(
    app: AppHandle,
    state: State<'_, AppState>,
    filename: String,
    result: QuizResultFile,
) -> Result<SaveResultResponse, String> {
    let (saved, evt) = state
        .storage
        .lock()
        .unwrap()
        .save_quiz_result(&filename, result)?;
    emit_storage_event(&app, evt);
    Ok(SaveResultResponse { result: saved })
}

#[tauri::command]
fn lookup_word_cmd(
    state: State<'_, AppState>,
    surface: String,
    options: Option<LookupOptionsInput>,
) -> LookupResult {
    let opts = options.unwrap_or_default();
    state.storage.lock().unwrap().lookup(&surface, &opts)
}

#[tauri::command]
fn import_dict_csv(
    app: AppHandle,
    state: State<'_, AppState>,
    filename: String,
    content: String,
) -> Result<FolderStatus, String> {
    let (status, evt) = state
        .storage
        .lock()
        .unwrap()
        .save_external_dict_csv(&filename, &content)?;
    emit_storage_event(&app, evt);
    Ok(status)
}

#[tauri::command]
fn get_translation_status(state: State<'_, AppState>) -> TranslationApiStatus {
    let guard = state.storage.lock().unwrap();
    translator::get_translation_status(guard.config_path(), Some(guard.data_dir()))
}

#[tauri::command]
fn save_translation_config(
    state: State<'_, AppState>,
    input: SaveTranslationConfigInput,
) -> Result<TranslationApiStatus, String> {
    let guard = state.storage.lock().unwrap();
    translator::save_translation_config(guard.config_path(), Some(guard.data_dir()), input)
}

#[tauri::command]
async fn fetch_translation_models(
    app: AppHandle,
    input: Option<FetchModelsInput>,
) -> Result<FetchModelsResult, String> {
    let (config_path, data_dir) = {
        let state = app.state::<AppState>();
        let guard = state.storage.lock().unwrap();
        (guard.config_path().to_path_buf(), guard.data_dir().to_path_buf())
    };
    translator::fetch_available_models(&config_path, Some(&data_dir), input.unwrap_or_default())
        .await
}

#[tauri::command]
async fn translate_word_cmd(
    app: AppHandle,
    input: TranslateWordInput,
) -> Result<LookupResult, String> {
    let (config_path, data_dir) = {
        let state = app.state::<AppState>();
        let guard = state.storage.lock().unwrap();
        (guard.config_path().to_path_buf(), guard.data_dir().to_path_buf())
    };
    translator::translate_word_with_api(&config_path, Some(&data_dir), input).await
}

#[tauri::command]
async fn fetch_tts_audio(input: TtsAudioInput) -> Result<TtsAudioResult, String> {
    tts::fetch_tts_audio(input).await
}

// ==================== GitHub Releases 零密钥应用内升级 Commands ====================

#[tauri::command]
fn get_update_state(state: State<'_, AppState>) -> AppUpdateState {
    state.updater.get_state()
}

#[tauri::command]
async fn check_for_updates(app: AppHandle) -> Result<AppUpdateState, String> {
    let updater = {
        let state = app.state::<AppState>();
        Arc::clone(&state.updater)
    };
    Ok(updater.check_for_updates(&app).await)
}

#[tauri::command]
async fn download_update(app: AppHandle) -> Result<AppUpdateState, String> {
    let updater = {
        let state = app.state::<AppState>();
        Arc::clone(&state.updater)
    };
    Ok(updater.download_update(&app).await)
}

#[tauri::command]
fn quit_and_install(app: AppHandle, state: State<'_, AppState>) -> ActionResult {
    state.updater.quit_and_install(&app)
}

#[tauri::command]
fn open_releases_page(app: AppHandle, state: State<'_, AppState>) -> ActionResult {
    let url = state.updater.get_state().repo_url;
    let Some(url) = url else {
        return ActionResult {
            ok: false,
            error: Some("未配置 GitHub Releases 仓库地址".to_string()),
        };
    };
    if !url.starts_with("https://github.com/") {
        return ActionResult {
            ok: false,
            error: Some("无效的 GitHub Releases 地址".to_string()),
        };
    }
    match app.opener().open_url(url, None::<&str>) {
        Ok(_) => ActionResult {
            ok: true,
            error: None,
        },
        Err(err) => ActionResult {
            ok: false,
            error: Some(err.to_string()),
        },
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let version = app.package_info().version.to_string();
            let storage = Arc::new(Mutex::new(StudyHubStorage::new()));
            let watcher = Mutex::new(None);
            let updater = Arc::new(UpdaterManager::new(version));

            restart_watcher(app.handle(), &storage, &watcher);

            app.manage(AppState {
                storage,
                watcher,
                updater,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_status,
            set_data_dir,
            pick_data_dir,
            open_data_dir,
            get_vocab,
            add_vocab,
            update_vocab,
            delete_vocab,
            record_review,
            export_markdown,
            import_inbox,
            get_quizzes,
            import_quiz,
            get_results,
            save_result,
            lookup_word_cmd,
            import_dict_csv,
            get_translation_status,
            save_translation_config,
            fetch_translation_models,
            translate_word_cmd,
            fetch_tts_audio,
            get_update_state,
            check_for_updates,
            download_update,
            quit_and_install,
            open_releases_page
        ])
        .run(tauri::generate_context!())
        .expect("error while running StudyHub Tauri application");
}
