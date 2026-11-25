/**
 * 统一提取前端与 Tauri v2 IPC 错误文本
 * Tauri invoke 失败时常直接 reject 字符串而非 Error 实例
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }
  if (typeof err === 'string' && err.trim()) {
    return err.trim();
  }
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) {
      return msg.trim();
    }
  }
  return fallback;
}
