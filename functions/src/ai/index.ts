/**
 * AI Provider 统一入口
 *
 * 通过 AI_PROVIDER 环境变量选择 provider（默认 gemini）
 * 对调用方透明 — 只需 import { analyzeWithAI } from "./ai"
 */

import { defineString } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { AIProvider, AIClient } from "./types";
import { GeminiClient } from "./gemini";
import { OpenAIClient } from "./openai";
import { ClaudeClient } from "./claude";

export { AIProvider, AIClient, AIAnalysisRequest } from "./types";

const aiProvider = defineString("AI_PROVIDER", { default: "gemini" });

let clientInstance: AIClient | null = null;

/**
 * 创建 AI 客户端（工厂函数）
 */
export function createAIClient(provider?: AIProvider): AIClient {
  const selected = provider || (aiProvider.value() as AIProvider);

  switch (selected) {
    case "gemini":
      return new GeminiClient();
    case "openai":
      return new OpenAIClient();
    case "claude":
      return new ClaudeClient();
    default:
      logger.warn(`Unknown AI provider "${selected}", falling back to gemini`);
      return new GeminiClient();
  }
}

/**
 * 获取全局 AI 客户端（单例，惰性初始化）
 */
export function getAIClient(): AIClient {
  if (!clientInstance) {
    clientInstance = createAIClient();
    logger.info(`AI provider initialized: ${clientInstance.provider} (${clientInstance.model})`);
  }
  return clientInstance;
}

/**
 * 调用 AI 多模态分析，返回 JSON 解析结果
 *
 * 这是对外的主入口，兼容旧 analyzeWithGemini 的函数签名
 */
export async function analyzeWithAI(
  prompt: string,
  images: { mimeType: string; data: string }[],
  video?: { mimeType: string; data: string }
): Promise<unknown> {
  const client = getAIClient();
  return client.analyze({ prompt, images, video });
}

/**
 * 获取当前 AI provider 的模型名称（用于日志/记录）
 */
export function getAIModelName(): string {
  return getAIClient().model;
}
