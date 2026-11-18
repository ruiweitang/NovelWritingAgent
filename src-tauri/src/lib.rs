//! RwtNovelAgent 库层入口：注册存储与 LLM 命令

mod llm;
mod storage;

/// 启动 Tauri 应用：挂载取消注册表状态并注册全部自定义命令
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(llm::CancelRegistry::default())
        .invoke_handler(tauri::generate_handler![
            storage::get_settings,
            storage::save_settings,
            storage::list_projects,
            storage::get_project,
            storage::create_project,
            storage::save_project,
            storage::delete_project,
            llm::llm_stream,
            llm::llm_cancel,
            llm::llm_test,
            llm::llm_models,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}