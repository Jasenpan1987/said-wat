import { LlmError } from "./llm/kimi.js";

/** Maps an LLM failure to a readable Chinese message for the note. */
export function friendlyError(err: unknown): string {
  if (err instanceof LlmError) {
    switch (err.code) {
      case "missing-key":
        return "未设置 MOONSHOT_API_KEY。请在项目根目录的 .env 中填入 key 后重试。";
      case "auth":
        return "API Key 无效或已过期。请检查 .env 中的 MOONSHOT_API_KEY。";
      case "network":
        return "网络错误，无法连接 Moonshot API。请检查网络后重试。";
      case "rate-limit":
        return "请求频率超限，请稍等几秒再试。";
      case "bad-response":
        return "模型返回的内容无法解析，请重试。";
      case "bad-input":
        return "没有可分析的内容。";
      default:
        return `发生未知错误：${err.message}`;
    }
  }
  return `发生未知错误：${err instanceof Error ? err.message : String(err)}`;
}
