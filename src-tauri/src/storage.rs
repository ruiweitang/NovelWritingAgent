//! 本地 JSON 文件存储：设置与小说项目的读写命令
//!
//! 存储位置：应用数据目录（macOS 为 ~/Library/Application Support/com.rwt.novelagent）
//! - settings.json          全局设置（服务商、环节绑定、主题）
//! - projects/index.json    项目轻量索引（用于首页列表）
//! - projects/{id}.json     单个小说项目完整数据

use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// 获取（并确保存在）应用数据目录
fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法获取应用数据目录: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("无法创建数据目录: {e}"))?;
    Ok(dir)
}

/// 获取（并确保存在）项目子目录
fn projects_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = data_dir(app)?.join("projects");
    fs::create_dir_all(&dir).map_err(|e| format!("无法创建项目目录: {e}"))?;
    Ok(dir)
}

/// 读取 JSON 文件；文件不存在时返回 Null
fn read_json(path: &PathBuf) -> Result<Value, String> {
    if !path.exists() {
        return Ok(Value::Null);
    }
    let text = fs::read_to_string(path).map_err(|e| format!("读取失败: {e}"))?;
    serde_json::from_str(&text).map_err(|e| format!("JSON 解析失败: {e}"))
}

/// 原子写入 JSON 文件：先写临时文件再 rename，避免写入中断导致损坏
fn write_json_atomic(path: &PathBuf, value: &Value) -> Result<(), String> {
    let tmp = path.with_extension("json.tmp");
    let text = serde_json::to_string_pretty(value).map_err(|e| format!("序列化失败: {e}"))?;
    fs::write(&tmp, text).map_err(|e| format!("写入失败: {e}"))?;
    fs::rename(&tmp, path).map_err(|e| format!("保存失败: {e}"))?;
    Ok(())
}

/// 校验项目 id 合法性（仅允许字母数字与连字符，防止路径穿越）
fn validate_id(id: &str) -> Result<(), String> {
    if id.is_empty() || !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return Err("非法的项目 ID".into());
    }
    Ok(())
}

/// 读取项目索引；不存在时返回空数组
fn read_index(app: &AppHandle) -> Result<Value, String> {
    let path = projects_dir(app)?.join("index.json");
    let value = read_json(&path)?;
    Ok(if value.is_null() { json!([]) } else { value })
}

/// 从完整项目数据中提取索引元信息（含环节确认进度）
fn project_meta(project: &Value) -> Value {
    let mut confirmed = 0u64;
    let mut total = 6u64;
    if let Some(stages) = project["stages"].as_object() {
        for stage in stages.values() {
            if stage["status"].as_str() == Some("confirmed") {
                confirmed += 1;
            }
        }
    }
    if let Some(chapters) = project["chapters"].as_array() {
        total += chapters.len() as u64;
        for chapter in chapters {
            if chapter["status"].as_str() == Some("confirmed") {
                confirmed += 1;
            }
        }
    }
    json!({
        "id": project["id"],
        "title": project["title"],
        "createdAt": project["createdAt"],
        "updatedAt": project["updatedAt"],
        "confirmed": confirmed,
        "total": total,
    })
}

/// 读取全局设置；首次启动返回 Null，由前端填充默认值
#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<Value, String> {
    read_json(&data_dir(&app)?.join("settings.json"))
}

/// 保存全局设置
#[tauri::command]
pub fn save_settings(app: AppHandle, settings: Value) -> Result<(), String> {
    write_json_atomic(&data_dir(&app)?.join("settings.json"), &settings)
}

/// 列出全部项目索引元信息
#[tauri::command]
pub fn list_projects(app: AppHandle) -> Result<Value, String> {
    read_index(&app)
}

/// 读取单个项目完整数据
#[tauri::command]
pub fn get_project(app: AppHandle, id: String) -> Result<Value, String> {
    validate_id(&id)?;
    read_json(&projects_dir(&app)?.join(format!("{id}.json")))
}

/// 创建项目：写入项目文件并追加索引
#[tauri::command]
pub fn create_project(app: AppHandle, project: Value) -> Result<(), String> {
    let id = project["id"].as_str().ok_or("项目缺少 id")?.to_string();
    validate_id(&id)?;
    write_json_atomic(&projects_dir(&app)?.join(format!("{id}.json")), &project)?;
    let mut index = read_index(&app)?;
    if let Some(arr) = index.as_array_mut() {
        arr.push(project_meta(&project));
    }
    write_json_atomic(&projects_dir(&app)?.join("index.json"), &index)
}

/// 保存项目：写入项目文件并同步更新索引中对应条目
#[tauri::command]
pub fn save_project(app: AppHandle, project: Value) -> Result<(), String> {
    let id = project["id"].as_str().ok_or("项目缺少 id")?.to_string();
    validate_id(&id)?;
    write_json_atomic(&projects_dir(&app)?.join(format!("{id}.json")), &project)?;
    let mut index = read_index(&app)?;
    let meta = project_meta(&project);
    if let Some(arr) = index.as_array_mut() {
        match arr.iter_mut().find(|m| m["id"].as_str() == Some(&id)) {
            Some(entry) => *entry = meta,
            None => arr.push(meta),
        }
    }
    write_json_atomic(&projects_dir(&app)?.join("index.json"), &index)
}

/// 删除项目：移除项目文件与索引条目
#[tauri::command]
pub fn delete_project(app: AppHandle, id: String) -> Result<(), String> {
    validate_id(&id)?;
    let path = projects_dir(&app)?.join(format!("{id}.json"));
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("删除失败: {e}"))?;
    }
    let mut index = read_index(&app)?;
    if let Some(arr) = index.as_array_mut() {
        arr.retain(|m| m["id"].as_str() != Some(&id));
    }
    write_json_atomic(&projects_dir(&app)?.join("index.json"), &index)
}