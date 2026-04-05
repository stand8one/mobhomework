/**
 * Gemini Provider 实现
 *
 * 使用 @google/generative-ai SDK
 * 支持多模态（图片+视频）输入，原生 JSON 输出
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { defineString } from "firebase-functions/params";
import { AIClient, AIAnalysisRequest } from "./types";

const geminiApiKey = defineString("GEMINI_API_KEY");

const DEFAULT_MODEL = "gemini-2.5-flash";

export class GeminiClient implements AIClient {
  readonly provider = "gemini" as const;
  readonly model: string;
  private client: GoogleGenerativeAI | null = null;

  constructor(model?: string) {
    this.model = model || DEFAULT_MODEL;
  }

  private getClient(): GoogleGenerativeAI {
    if (!this.client) {
      this.client = new GoogleGenerativeAI(geminiApiKey.value());
    }
    return this.client;
  }

  async analyze(request: AIAnalysisRequest): Promise<unknown> {
    const client = this.getClient();
    const model = client.getGenerativeModel({
      model: this.model,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [{ text: request.prompt }];

    for (const img of request.images) {
      parts.push({ inlineData: img });
    }

    if (request.video) {
      parts.push({ inlineData: request.video });
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
    });

    const text = result.response.text();
    return JSON.parse(text);
  }
}
