/**
 * OpenAI (ChatGPT) Provider 实现
 *
 * 使用 openai SDK
 * 支持多模态（图片），通过 response_format 强制 JSON 输出
 * 注意：OpenAI 不支持视频输入，video 参数将被忽略
 */

import OpenAI from "openai";
import { defineString } from "firebase-functions/params";
import { AIClient, AIAnalysisRequest } from "./types";
import { logger } from "firebase-functions";

const openaiApiKey = defineString("OPENAI_API_KEY");
const openaiModel = defineString("OPENAI_MODEL", { default: "gpt-4o" });

export class OpenAIClient implements AIClient {
  readonly provider = "openai" as const;
  readonly model: string;
  private client: OpenAI | null = null;

  constructor(model?: string) {
    this.model = model || openaiModel.value();
  }

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({ apiKey: openaiApiKey.value() });
    }
    return this.client;
  }

  async analyze(request: AIAnalysisRequest): Promise<unknown> {
    const client = this.getClient();

    if (request.video) {
      logger.warn("OpenAI provider does not support video input, ignoring video");
    }

    // 构建 content 数组：文本 + 图片
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: "text", text: request.prompt },
    ];

    for (const img of request.images) {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${img.mimeType};base64,${img.data}`,
          detail: "high",
        },
      });
    }

    const response = await client.chat.completions.create({
      model: this.model,
      messages: [{ role: "user", content }],
      response_format: { type: "json_object" },
      max_tokens: 4096,
    });

    const text = response.choices[0]?.message?.content || "{}";
    return JSON.parse(text);
  }
}
