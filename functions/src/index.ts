import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";

import { handlePageCreated } from "./onPageCreated";
import { handleCaptureCreated } from "./onCaptureCreated";

// 初始化 Firebase Admin
initializeApp();

/**
 * 当新的作业页面被录入时触发
 * 调用 Gemini 解析题目，写入 questions 子集合
 */
export const onPageCreated = onDocumentCreated(
  "users/{userId}/sessions/{sessionId}/pages/{pageId}",
  handlePageCreated
);

/**
 * 当新的采集记录被创建时触发
 * 调用 Gemini 分析进度，写入 analyses 子集合
 */
export const onCaptureCreated = onDocumentCreated(
  "users/{userId}/sessions/{sessionId}/captures/{captureId}",
  handleCaptureCreated
);
