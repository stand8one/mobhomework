/**
 * Gemini Prompt 模板
 * 所有与 Gemini 交互的 prompt 集中管理
 */

/**
 * 作业页面解析 Prompt
 * 输入：一张作业页面照片
 * 输出：识别出的题目列表
 */
export const PAGE_PARSE_PROMPT = `
你是一个小学生作业分析助手。请仔细分析这张作业页面的照片。

## 任务
识别出页面中的每一道题目，以单道题目为最小颗粒度。

## 返回 JSON 格式
{
  "subject": "语文|数学|英语|科学|其他",
  "pageDescription": "简短描述这一页的内容",
  "questions": [
    {
      "index": 1,
      "label": "简短描述，如：第一大题第1小题 看拼音写词语",
      "type": "fill_blank|choice|calculation|word_problem|copy|reading|other",
      "estimatedMinutes": 2,
      "boundingBox": { "x": 0.1, "y": 0.1, "width": 0.8, "height": 0.15 }
    }
  ]
}

## 注意事项
- 以单道题为最小颗粒度，如果一道大题有多个小题，每个小题都要单独列出
- type 类型说明：
  - fill_blank: 填空题
  - choice: 选择题
  - calculation: 计算题
  - word_problem: 应用题/解答题
  - copy: 抄写/默写
  - reading: 阅读理解
  - other: 其他类型
- estimatedMinutes 基于小学生的平均速度预估（不是成人速度）
- boundingBox 使用归一化坐标 (0-1)，表示题目在页面中的位置
- 铅笔字迹可能很浅，请仔细辨认已有内容
- 如果页面模糊无法识别，返回空的 questions 数组并在 pageDescription 中说明
`;

/**
 * 进度分析 Prompt
 * 输入：初始作业照片 + 当前采集照片 + 各题当前状态
 * 输出：进度变化和分析结果
 */
export function buildProgressPrompt(questionsStatus: Record<string, string>): string {
  return `
你是一个作业进度分析助手。你的任务是对比作业页面的初始状态和当前状态，判断各题目的完成情况。

## 题目当前状态
${JSON.stringify(questionsStatus, null, 2)}

## 分析要求
对比【初始照片】和【当前采集照片】，判断各题目的状态变化。

## 返回 JSON 格式
{
  "matchedPageId": "对应的 pageId，如果无法匹配返回 null",
  "questionsProgress": [
    {
      "questionId": "题目ID",
      "newStatus": "unanswered|in_progress|completed",
      "confidence": 0.95
    }
  ],
  "anomalies": [],
  "sceneDescription": "简短描述当前场景，如：孩子正在写第3题"
}

## 注意事项
- 如果照片模糊或被遮挡，将 confidence 设为低值（< 0.5），不要猜测状态
- 铅笔字迹很浅时仍需努力辨认，只要有笔迹就说明在作答
- anomalies 可选值:
  - "stalled": 长时间没有进度变化
  - "left_desk": 检测到作业区域无人
  - "frequent_erasing": 同一区域频繁修改
- 只返回状态有变化的题目，没变化的不需要列出
- 如果当前画面不是任何已知的作业页，matchedPageId 设为 null
`;
}

/**
 * Session 总结报告 Prompt
 */
export const SESSION_SUMMARY_PROMPT = `
你是一个作业分析助手。请根据以下作业数据生成一份友好的总结报告。

## 返回 JSON 格式
{
  "summary": "整体评价，用鼓励的语气",
  "highlights": ["亮点1", "亮点2"],
  "suggestions": ["建议1"],
  "efficiencyStars": 3
}

## 注意事项
- 语气必须正面、鼓励，强调孩子做得好的地方
- efficiencyStars 1-5 星，基于完成效率
- 绝不使用批评或惩罚性语言
- 用"你"来称呼孩子
`;

/**
 * 云端 Diff 判定 Prompt（Phase 3 核心）
 *
 * 输入：原始作业页照片 + 当前采集照片 + 各题 boundingBox
 * 输出：每个 boundingBox 区域是否有新笔迹（即是否做了题）
 *
 * 关键原理：对比同一区域在两个时间点的像素变化，
 * 新增笔迹（铅笔/按钮/勾选）= 该题正在作答或已完成
 */
export function buildDiffDetectionPrompt(
  questions: Array<{
    questionId: string;
    label: string;
    boundingBox: { x: number; y: number; width: number; height: number };
    currentStatus: string;
  }>
): string {
  return `
你是一个作业进度 Diff 检测专家。你的任务是对比同一作业页的【原始照片（拍摄时）】和【当前高拍仪采集照片】。

## 需要检查的题目区域
${JSON.stringify(questions, null, 2)}

## 分析要求

对于每个题目的 boundingBox 区域：
1. **对比**该区域在两张图中的差异
2. **检测**是否有新增笔迹（铅笔字、勾选、擦除痕迹等）
3. **判定**题目状态：
   - 无变化 → 保持原状态
   - 有少量新笔迹 → "in_progress"
   - 区域大部分已填写 → "completed"

## 返回 JSON 格式
{
  "diffResults": [
    {
      "questionId": "题目ID",
      "hasNewInk": true,
      "inkCoverage": 0.7,
      "newStatus": "completed",
      "confidence": 0.9,
      "description": "检测到大量铅笔笔迹覆盖答题区域"
    }
  ],
  "overallChange": "significant|minor|none",
  "sceneDescription": "当前场景描述"
}

## 注意事项
- **铅笔字迹很浅**，但只要能看到任何笔画变化就应该报告 hasNewInk: true
- inkCoverage 表示答题区域被笔迹覆盖的比例 (0-1)
- confidence 低于 0.5 时不应变更题目状态
- 如果图片模糊或角度偏差大，降低 confidence
- 只返回检测到变化的题目，无变化的不需要列出
- 擦除痕迹（橡皮擦痕迹）也算作变化
`;
}

