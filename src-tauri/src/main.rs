// 发布模式下隐藏 Windows 控制台窗口（macOS 无影响）
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// 程序入口：调用库层 run 启动 Tauri 应用
fn main() {
    rwt_novel_agent_lib::run()
}