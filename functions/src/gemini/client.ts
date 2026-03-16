import { GoogleGenerativeAI } from "@google/generative-ai";
import { defineString } from "firebase-functions/params";

const geminiApiKey = defineString("GEMINI_API_KEY");

let genAIInstance: GoogleGenerativeAI | null = null;

/**
 * 获取 Gemini AI 客户端（单例）
 */
export function getGeminiClient(): GoogleGenerativeAI {
  if (!genAIInstance) {
    genAIInstance = new GoogleGenerativeAI(geminiApiKey.value());
  }
  return genAIInstance;
}

/**
 * 调用 Gemini 多模态分析，返回 JSON 解析结果
 */
export async function analyzeWithGemini(
  prompt: string,
  images: { mimeType: string; data: string }[],
  video?: { mimeType: string; data: string }
): Promise<unknown> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
  ];

  for (const img of images) {
    parts.push({ inlineData: img });
  }

  if (video) {
    parts.push({ inlineData: video });
  }

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
  });

  const text = result.response.text();
  return JSON.parse(text);
}
