import { buildDiffDetectionPrompt } from "../ai/prompts";

describe("C1: 云端 Diff 判定", () => {
  describe("buildDiffDetectionPrompt", () => {
    it("包含所有题目的 boundingBox 信息", () => {
      const questions = [
        {
          questionId: "q1",
          label: "第1题 计算",
          boundingBox: { x: 0.1, y: 0.1, width: 0.8, height: 0.15 },
          currentStatus: "unanswered",
        },
        {
          questionId: "q2",
          label: "第2题 填空",
          boundingBox: { x: 0.1, y: 0.3, width: 0.8, height: 0.15 },
          currentStatus: "in_progress",
        },
      ];

      const prompt = buildDiffDetectionPrompt(questions);

      expect(prompt).toContain("q1");
      expect(prompt).toContain("q2");
      expect(prompt).toContain("boundingBox");
      expect(prompt).toContain("Diff");
    });

    it("prompt 包含关键指令", () => {
      const questions = [
        {
          questionId: "q1",
          label: "第1题",
          boundingBox: { x: 0, y: 0, width: 1, height: 0.5 },
          currentStatus: "unanswered",
        },
      ];

      const prompt = buildDiffDetectionPrompt(questions);

      expect(prompt).toContain("hasNewInk");
      expect(prompt).toContain("inkCoverage");
      expect(prompt).toContain("confidence");
      expect(prompt).toContain("铅笔字迹");
    });

    it("空题目列表不崩溃", () => {
      const prompt = buildDiffDetectionPrompt([]);
      expect(prompt).toBeTruthy();
      expect(prompt).toContain("[]");
    });
  });
});
