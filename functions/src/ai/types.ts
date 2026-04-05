/**
 * AI Provider 统一接口定义
 *
 * 支持 Gemini / OpenAI (ChatGPT) / Anthropic (Claude) 三种 Provider
 * 通过环境变量 AI_PROVIDER 选择，默认 gemini
 */

export type AIProvider = "gemini" | "openai" | "claude";

export interface AIAnalysisRequest {
  prompt: string;
  images: { mimeType: string; data: string }[];
  video?: { mimeType: string; data: string };
}

export interface AIClient {
  /**
   * 发送多模态分析请求，返回 JSON 解析后的结果
   */
  analyze(request: AIAnalysisRequest): Promise<unknown>;

  /** Provider 标识 */
  readonly provider: AIProvider;

  /** 当前使用的模型名称 */
  readonly model: string;
}
