/**
 * LLM 流式调用客户端：Channel 订阅、取消、连接测试、模型列表
 */
import { Channel, invoke } from '@tauri-apps/api/core'
import type { ChatPayload, StreamEvent } from '@/types'

/** 流式回调 */
export interface StreamHandlers {
  onDelta: (text: string) => void
  onDone: () => void
  onError: (message: string) => void
}

/**
 * 发起流式聊天：立即返回 requestId（用于取消），增量经回调推送
 * @param payload 请求载荷（baseUrl/apiKey/model/messages/temperature）
 * @param handlers 流事件回调
 */
export function streamChat(
  payload: ChatPayload,
  handlers: StreamHandlers,
): string {
  const requestId = crypto.randomUUID()
  const channel = new Channel<StreamEvent>()
  channel.onmessage = (event) => {
    if (event.type === 'delta') handlers.onDelta(event.text)
    else if (event.type === 'done') handlers.onDone()
    else handlers.onError(event.message)
  }
  // 不 await：命令在流结束后才返回，错误统一走 Channel 的 error 事件
  invoke('llm_stream', { requestId, payload, channel }).catch((e) => {
    handlers.onError(String(e))
  })
  return requestId
}

/**
 * 取消指定流式请求
 * @param requestId streamChat 返回的请求 id
 */
export function cancelStream(requestId: string): Promise<void> {
  return invoke('llm_cancel', { requestId })
}

/**
 * 连接测试：发送一条极短请求验证 URL/Key/模型可用
 */
export function testConnection(
  baseUrl: string,
  apiKey: string,
  model: string,
): Promise<string> {
  return invoke<string>('llm_test', { baseUrl, apiKey, model })
}

/**
 * 拉取服务商可用模型列表（失败时由调用方降级为手动输入）
 */
export function fetchModels(baseUrl: string, apiKey: string): Promise<string[]> {
  return invoke<string[]>('llm_models', { baseUrl, apiKey })
}
