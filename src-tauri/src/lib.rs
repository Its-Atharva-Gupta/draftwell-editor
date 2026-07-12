use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::Mutex,
};
use tauri::{Emitter, Manager, State, WebviewWindow};
use tauri_plugin_dialog::{
    DialogExt, MessageDialogButtons, MessageDialogKind, MessageDialogResult,
};

const MAX_DOCUMENT_SIZE: u64 = 10 * 1024 * 1024;
const MAX_CUSTOMIZATION_SIZE: u64 = 1024 * 1024;
const DOCUMENT_EXTENSIONS: [&str; 7] = ["md", "markdown", "mdown", "mkd", "txt", "html", "htm"];
const DEFAULT_CUSTOM_CSS: &str = "/* Draftwell custom CSS\n * This file is reloaded when you return to the app.\n * Example: :root { --accent: #7c5cff; }\n */\n";
const DEFAULT_CUSTOM_JS: &str = "/* Draftwell custom JavaScript (trusted local code)\n * This file is reloaded when you return to the app.\n * Return a function to clean up listeners before the next reload.\n *\n * Example:\n * const off = draftwell.on(\"statechange\", ({ state }) => console.log(state));\n * return off;\n */\n";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Document {
    path: String,
    name: String,
    content: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SavedFile {
    path: String,
    name: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CustomizationSources {
    directory: String,
    css: String,
    javascript: String,
}

struct StartupFiles(Mutex<Vec<PathBuf>>);

fn file_arguments(arguments: &[String]) -> Vec<PathBuf> {
    arguments
        .iter()
        .skip(1)
        .filter_map(|argument| {
            let path = PathBuf::from(argument);
            let supported = path
                .extension()
                .and_then(|extension| extension.to_str())
                .is_some_and(|extension| {
                    DOCUMENT_EXTENSIONS.contains(&extension.to_lowercase().as_str())
                });
            supported.then_some(path)
        })
        .collect()
}

fn read_document_from_path(path: &Path) -> Result<Document, String> {
    let canonical = path
        .canonicalize()
        .map_err(|error| format!("Could not resolve the selected file: {error}"))?;
    let metadata =
        fs::metadata(&canonical).map_err(|error| format!("Could not inspect the file: {error}"))?;
    if !metadata.is_file() {
        return Err("The selected path is not a file.".into());
    }
    if metadata.len() > MAX_DOCUMENT_SIZE {
        return Err("Draftwell supports text files up to 10 MB.".into());
    }

    let content = fs::read_to_string(&canonical)
        .map_err(|error| format!("The file could not be read as UTF-8 text: {error}"))?;
    let name = canonical
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Untitled.md")
        .to_owned();

    Ok(Document {
        path: canonical.to_string_lossy().into_owned(),
        name,
        content,
    })
}

fn write_document_to_path(path: &Path, content: &str) -> Result<SavedFile, String> {
    fs::write(path, content).map_err(|error| format!("Could not save the file: {error}"))?;
    let canonical = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
    let name = canonical
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Untitled.md")
        .to_owned();

    Ok(SavedFile {
        path: canonical.to_string_lossy().into_owned(),
        name,
    })
}

fn customization_directory(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map(|path| path.join("customizations"))
        .map_err(|error| format!("Could not resolve the customization directory: {error}"))
}

fn ensure_customization_file(path: &Path, initial_content: &str) -> Result<(), String> {
    if !path.exists() {
        fs::write(path, initial_content)
            .map_err(|error| format!("Could not create {}: {error}", path.display()))?;
    }
    Ok(())
}

fn read_customization_file(path: &Path) -> Result<String, String> {
    let metadata = fs::metadata(path)
        .map_err(|error| format!("Could not inspect {}: {error}", path.display()))?;
    if metadata.len() > MAX_CUSTOMIZATION_SIZE {
        return Err(format!("{} must be smaller than 1 MB.", path.display()));
    }
    fs::read_to_string(path)
        .map_err(|error| format!("Could not read {} as UTF-8: {error}", path.display()))
}

fn prepare_customization_directory(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let directory = customization_directory(app)?;
    fs::create_dir_all(&directory)
        .map_err(|error| format!("Could not create {}: {error}", directory.display()))?;
    ensure_customization_file(&directory.join("custom.css"), DEFAULT_CUSTOM_CSS)?;
    ensure_customization_file(&directory.join("custom.js"), DEFAULT_CUSTOM_JS)?;
    Ok(directory)
}

#[tauri::command]
fn load_customizations(app: tauri::AppHandle) -> Result<CustomizationSources, String> {
    let directory = prepare_customization_directory(&app)?;
    Ok(CustomizationSources {
        css: read_customization_file(&directory.join("custom.css"))?,
        javascript: read_customization_file(&directory.join("custom.js"))?,
        directory: directory.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
fn open_customizations_folder(app: tauri::AppHandle) -> Result<String, String> {
    let directory = prepare_customization_directory(&app)?;
    #[cfg(target_os = "windows")]
    let mut command = Command::new("explorer");
    #[cfg(target_os = "macos")]
    let mut command = Command::new("open");
    #[cfg(all(unix, not(target_os = "macos")))]
    let mut command = Command::new("xdg-open");

    command
        .arg(&directory)
        .spawn()
        .map_err(|error| format!("Could not open {}: {error}", directory.display()))?;
    Ok(directory.to_string_lossy().into_owned())
}

#[tauri::command]
fn execute_customization(
    window: WebviewWindow,
    javascript: String,
    source_url: String,
) -> Result<(), String> {
    if javascript.len() as u64 > MAX_CUSTOMIZATION_SIZE {
        return Err("custom.js must be smaller than 1 MB.".into());
    }
    let source_url = source_url.replace(['\r', '\n'], "");
    let script = format!(
        r#"(() => {{
  try {{
    if (typeof window.__draftwellCustomizationCleanup === "function") {{
      window.__draftwellCustomizationCleanup();
    }}
    window.__draftwellCustomizationCleanup = null;
    const draftwell = window.draftwell;
    const cleanup = (() => {{
{javascript}
    }})();
    if (typeof cleanup === "function") window.__draftwellCustomizationCleanup = cleanup;
  }} catch (error) {{
    window.dispatchEvent(new CustomEvent("draftwell:customizationerror", {{
      detail: {{ error, message: error instanceof Error ? error.message : String(error) }}
    }}));
  }}
}})();
//# sourceURL={source_url}"#
    );
    window
        .eval(&script)
        .map_err(|error| format!("Could not execute custom.js: {error}"))
}

#[tauri::command]
async fn open_documents(app: tauri::AppHandle) -> Result<Vec<Document>, String> {
    let selection = app
        .dialog()
        .file()
        .set_title("Open Markdown file")
        .add_filter("Markdown", &["md", "markdown", "mdown", "mkd"])
        .add_filter("HTML", &["html", "htm"])
        .add_filter("Text", &["txt"])
        .blocking_pick_files();

    selection
        .unwrap_or_default()
        .into_iter()
        .map(|file| {
            file.into_path()
                .map_err(|error| format!("Could not resolve the selected path: {error}"))
                .and_then(|path| read_document_from_path(&path))
        })
        .collect()
}

#[tauri::command]
async fn read_document(path: String) -> Result<Document, String> {
    read_document_from_path(Path::new(&path))
}

#[tauri::command]
async fn save_document(path: String, content: String) -> Result<SavedFile, String> {
    write_document_to_path(Path::new(&path), &content)
}

#[tauri::command]
async fn save_document_as(
    app: tauri::AppHandle,
    suggested_name: String,
    content: String,
) -> Result<Option<SavedFile>, String> {
    let selection = app
        .dialog()
        .file()
        .set_title("Save Markdown file")
        .set_file_name(if suggested_name.is_empty() {
            "Untitled.md"
        } else {
            &suggested_name
        })
        .add_filter("Markdown", &["md", "markdown", "mdown", "mkd"])
        .add_filter("HTML", &["html", "htm"])
        .add_filter("Text", &["txt"])
        .blocking_save_file();

    selection
        .map(|file| {
            file.into_path()
                .map_err(|error| format!("Could not resolve the selected path: {error}"))
                .and_then(|path| write_document_to_path(&path, &content))
        })
        .transpose()
}

#[tauri::command]
async fn confirm_discard(app: tauri::AppHandle) -> bool {
    app.dialog()
        .message("This file has unsaved changes. Continue without saving them?")
        .title("Discard changes?")
        .kind(MessageDialogKind::Warning)
        .buttons(MessageDialogButtons::YesNo)
        .blocking_show()
}

#[tauri::command]
async fn confirm_close(app: tauri::AppHandle, file_name: String) -> String {
    let result = app
        .dialog()
        .message(format!("Do you want to save changes to {file_name}?"))
        .title("Unsaved changes")
        .kind(MessageDialogKind::Warning)
        .buttons(MessageDialogButtons::YesNoCancelCustom(
            "Save".into(),
            "Don’t Save".into(),
            "Cancel".into(),
        ))
        .blocking_show_with_result();

    match result {
        MessageDialogResult::Yes => "save",
        MessageDialogResult::No => "discard",
        MessageDialogResult::Custom(label) if label == "Save" => "save",
        MessageDialogResult::Custom(label) if label == "Don’t Save" => "discard",
        _ => "cancel",
    }
    .into()
}

#[tauri::command]
fn set_window_title(window: WebviewWindow, title: String, dirty: bool) -> Result<(), String> {
    let marker = if dirty { " •" } else { "" };
    window
        .set_title(&format!(
            "{}{marker} — Draftwell",
            if title.is_empty() {
                "Untitled.md"
            } else {
                &title
            }
        ))
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn force_close(window: WebviewWindow) -> Result<(), String> {
    window.destroy().map_err(|error| error.to_string())
}

#[tauri::command]
fn startup_documents(startup: State<StartupFiles>) -> Result<Vec<Document>, String> {
    let paths = std::mem::take(
        &mut *startup
            .0
            .lock()
            .map_err(|_| "Startup file state is unavailable.")?,
    );
    paths
        .into_iter()
        .map(|path| read_document_from_path(&path))
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let startup_paths = file_arguments(&std::env::args().collect::<Vec<_>>());

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
                for path in file_arguments(&argv) {
                    let _ = window.emit("file-open-request", path.to_string_lossy().into_owned());
                }
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .manage(StartupFiles(Mutex::new(startup_paths)))
        .invoke_handler(tauri::generate_handler![
            open_documents,
            read_document,
            save_document,
            save_document_as,
            confirm_discard,
            confirm_close,
            set_window_title,
            force_close,
            startup_documents,
            load_customizations,
            open_customizations_folder,
            execute_customization
        ])
        .run(tauri::generate_context!())
        .expect("error while running Draftwell");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn detects_supported_file_arguments() {
        let arguments = vec![
            "draftwell".into(),
            "/tmp/notes.md".into(),
            "/tmp/page.html".into(),
        ];
        assert_eq!(
            file_arguments(&arguments),
            vec![
                PathBuf::from("/tmp/notes.md"),
                PathBuf::from("/tmp/page.html")
            ]
        );

        let unsupported = vec!["draftwell".into(), "/tmp/archive.zip".into()];
        assert!(file_arguments(&unsupported).is_empty());
    }

    #[test]
    fn reads_and_writes_plain_utf8_files() {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be valid")
            .as_nanos();
        let path = std::env::temp_dir().join(format!("draftwell-{unique}.md"));
        fs::write(&path, "# Original\n").expect("fixture should be created");

        let opened = read_document_from_path(&path).expect("fixture should open");
        assert_eq!(opened.content, "# Original\n");

        write_document_to_path(&path, "# Updated\n").expect("fixture should save");
        assert_eq!(fs::read_to_string(&path).unwrap(), "# Updated\n");

        fs::remove_file(path).expect("fixture should be removed");
    }
}
