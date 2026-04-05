/**
 * Anthropic Claude Provider 实现
 *
 * 使用 @anthropic-ai/sdk
 * 支持多模态（图片），通过 prompt 引导 JSON 输出
 * 注意：Claude 不支持视频输入，video 参数将被忽略
 */

import Anthropic from "@anthropic-ai/sdk";
import { defineString } from "firebase-functions/params";
import { AIClient, AIAnalysisRequest } from "./types";
import { logger } from "firebase-functions";

const anthropicApiKey = defineString("ANTHROPIC_API_KEY");
const claudeModel = defineString("CLAUDE_MODEL", { default: "claude-sonnet-4-20250514" });

export class ClaudeClient implements AIClient {
  readonly provider = "claude" as const;
  readonly model: string;
  private client: Anthropic | null = null;

  constructor(model?: string) {
    this.model = model || claudeModel.value();
  }

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({ apiKey: anthropicApiKey.value() });
    }
    return this.client;
  }

  async analyze(request: AIAnalysisRequest): Promise<unknown> {
    const client = this.getClient();

    if (request.video) {
      logger.warn("Claude provider does not support video input, ignoring video");
    }

    // 构建 content 数组：图片 + 文本（Claude 推荐图片在前）
    const content: Anthropic.Messages.ContentBlockParam[] = [];

    for (const img of request.images) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: img.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: img.data,
        },
      });
    }

    // Claude 没有原生 JSON mode，通过 prompt 前缀引导
    const jsonPrompt = `${request.prompt}\n\n请严格以 JSON 格式返回结果，不要包含任何其他文字或 markdown 代码块标记。`;

    content.push({ type: "text", text: jsonPrompt });

    const response = await client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [{ role: "user", content }],
    });

    // 提取文本响应
    const textBlock = response.content.find(
      (block): block is Anthropic.Messages.TextBlock => block.type === "text"
    );
    const text = textBlock ? textBlock.text : "{}";

    // 尝试提取 JSON（Claude 有时会包裹在 ```json ... ``` 中）
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : text;

    return JSON.parse(jsonStr.trim());
  }
}
