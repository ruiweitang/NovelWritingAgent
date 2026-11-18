//! LLM 接入模块：OpenAI 兼容协议的流式聊天、连接测试、模型列表与取消
//!
//! 所有请求在 Rust 侧发出（reqwest + rustls），规避 WebView CORS 限制；
//! 流式增量通过 Tauri IPC Channel 推送给前端。

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Duration;
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager};
use tokio::task::AbortHandle;

/// 全局取消注册表：requestId -> 任务中止句柄
#[derive(Default)]
pub struct CancelRegistry(pub Mutex<HashMap<String, AbortHandle>>);

/// 聊天消息（与 OpenAI 协议一致）
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// 流式聊天请求载荷
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatPayload {
    pub base_url: String,
    pub api_key: String,
    pub model: String,
    pub messages: Vec<ChatMessage>,
    pub temperature: f32,
}

/// 推送给前端的流事件
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum StreamEvent {
    /// 增量文本
    Delta { text: String },
    /// 正常结束（或被取消）
    Done,
    /// 出错（含 HTTP 状态与响应摘要）
    Error { message: String },
}

/// 截断过长文本，避免错误信息刷屏
fn truncate(text: &str, max: usize) -> String {
    if text.chars().count() <= max {
        text.to_string()
    } else {
        let head: String = text.chars().take(max).collect();
        format!("{head}…")
    }
}

/// 拼接接口地址：去除 baseUrl 末尾斜杠后追加路径
fn endpoint(base_url: &str, path: &str) -> String {
    format!("{}/{}", base_url.trim_end_matches('/'), path)
}

/// 构建带超时的 HTTP 客户端
fn http_client(timeout_secs: u64) -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(timeout_secs))
        .build()
        .map_err(|e| format!("HTTP 客户端初始化失败: {e}"))
}

/// 执行一次流式聊天：解析 SSE 行并将增量推入 Channel
async fn run_stream(payload: ChatPayload, channel: &Channel<StreamEvent>) -> Result<(), String> {
    // 流式请求不设整体超时（长文生成可能持续数分钟）
    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("HTTP 客户端初始化失败: {e}"))?;

    let body = serde_json::json!({
        "model": payload.model,
        "messages": payload.messages,
        "temperature": payload.temperature,
        "stream": true,
    });

    let resp = client
        .post(endpoint(&payload.base_url, "chat/completions"))
        .bearer_auth(&payload.api_key)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("请求失败: {e}"))?;

    let status = resp.status();
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("HTTP {}: {}", status.as_u16(), truncate(&text, 500)));
    }

    let mut stream = resp.bytes_stream();
    let mut buf = String::new();
    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|e| format!("流读取失败: {e}"))?;
        buf.push_str(&String::from_utf8_lossy(&bytes));
        // 按完整行解析 SSE；不完整的半行留在缓冲区等待下一块
        while let Some(pos) = buf.find('\n') {
            let line: String = buf.drain(..=pos).collect();
            let line = line.trim();
            let Some(data) = line.strip_prefix("data:") else {
                continue;
            };
            let data = data.trim();
            if data == "[DONE]" {
                return Ok(());
            }
            let Ok(value) = serde_json::from_str::<serde_json::Value>(data) else {
                continue;
            };
            // 部分服务会在流中返回错误对象
            if let Some(err) = value.get("error") {
                return Err(format!("模型服务错误: {}", truncate(&err.to_string(), 500)));
            }
            if let Some(text) = value["choices"][0]["delta"]["content"].as_str() {
                if !text.is_empty() {
                    channel
                        .send(StreamEvent::Delta { text: text.to_string() })
                        .map_err(|e| format!("事件推送失败: {e}"))?;
                }
            }
        }
    }
    Ok(())
}

/// 流式聊天命令：后台任务执行请求，支持通过 llm_cancel 中止
#[tauri::command]
pub async fn llm_stream(
    app: AppHandle,
    request_id: String,
    payload: ChatPayload,
    channel: Channel<StreamEvent>,
) -> Result<(), String> {
    // 克隆一份 Channel 移入后台任务，原句柄保留用于取消后的补发
    let task_channel = channel.clone();
    let task = tokio::spawn(async move {
        match run_stream(payload, &task_channel).await {
            Ok(()) => {
                let _ = task_channel.send(StreamEvent::Done);
            }
            Err(message) => {
                let _ = task_channel.send(StreamEvent::Error { message });
            }
        }
    });

    app.state::<CancelRegistry>()
        .0
        .lock()
        .unwrap()
        .insert(request_id.clone(), task.abort_handle());

    let joined = task.await;

    app.state::<CancelRegistry>()
        .0
        .lock()
        .unwrap()
        .remove(&request_id);

    // 任务被取消时补发 Done，确保前端状态复位
    if joined.is_err() {
        let _ = channel.send(StreamEvent::Done);
    }
    Ok(())
}

/// 取消指定请求的流式任务
#[tauri::command]
pub fn llm_cancel(app: AppHandle, request_id: String) {
    if let Some(handle) = app
        .state::<CancelRegistry>()
        .0
        .lock()
        .unwrap()
        .remove(&request_id)
    {
        handle.abort();
    }
}

/// 连接测试命令：发送一条极短的非流式请求验证 URL/Key/模型可用
#[tauri::command]
pub async fn llm_test(base_url: String, api_key: String, model: String) -> Result<String, String> {
    let client = http_client(30)?;
    let body = serde_json::json!({
        "model": model,
        "messages": [{ "role": "user", "content": "ping" }],
        "stream": false,
    });
    let resp = client
        .post(endpoint(&base_url, "chat/completions"))
        .bearer_auth(&api_key)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("请求失败: {e}"))?;
    let status = resp.status();
    let text = resp.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(format!("HTTP {}: {}", status.as_u16(), truncate(&text, 500)));
    }
    Ok("连接成功".into())
}

/// 模型列表命令：GET /models 拉取可用模型 id（失败时前端降级手动输入）
#[tauri::command]
pub async fn llm_models(base_url: String, api_key: String) -> Result<Vec<String>, String> {
    let client = http_client(20)?;
    let resp = client
        .get(endpoint(&base_url, "models"))
        .bearer_auth(&api_key)
        .send()
        .await
        .map_err(|e| format!("请求失败: {e}"))?;
    let status = resp.status();
    let text = resp.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(format!("HTTP {}: {}", status.as_u16(), truncate(&text, 300)));
    }
    let value: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("响应解析失败: {e}"))?;
    let mut models: Vec<String> = value["data"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|m| m["id"].as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();
    models.sort();
    models.dedup();
    Ok(models)
}