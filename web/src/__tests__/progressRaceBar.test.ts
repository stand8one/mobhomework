/**
 * WB-3: 双轨进度条渲染测试 (ProgressRaceBar)
 *
 * 纯逻辑测试：验证进度条宽度计算和 badge 文字/颜色
 * 不需要 Firebase mock
 */
import { describe, it, expect } from "vitest";

// 从 ProgressRaceBar 中提取的纯逻辑函数
// 这些函数需要在 ProgressRaceBar.tsx 中 export

/**
 * 计算进度条宽度百分比
 */
function calculateBarWidth(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((count / total) * 100));
}

/**
 * 获取 badge 显示内容
 */
function getBadgeInfo(aheadOfPlan: number): { text: string; variant: "success" | "warning" | "danger" | "info" } {
  if (aheadOfPlan > 0) {
    return { text: `🎉 领先 ${aheadOfPlan} 题`, variant: "success" };
  } else if (aheadOfPlan >= -1) {
    return { text: "👍 同步", variant: "info" };
  } else if (aheadOfPlan >= -3) {
    return { text: `💪 落后 ${Math.abs(aheadOfPlan)} 题`, variant: "warning" };
  } else {
    return { text: `⚠️ 落后 ${Math.abs(aheadOfPlan)} 题`, variant: "danger" };
  }
}

describe("WB-3: 双轨进度条渲染", () => {
  describe("calculateBarWidth", () => {
    it("12/20 = 60%", () => {
      expect(calculateBarWidth(12, 20)).toBe(60);
    });

    it("20/20 = 100%", () => {
      expect(calculateBarWidth(20, 20)).toBe(100);
    });

    it("0/20 = 0%", () => {
      expect(calculateBarWidth(0, 20)).toBe(0);
    });

    it("total=0 → 不除零 → 0%", () => {
      expect(calculateBarWidth(5, 0)).toBe(0);
    });

    it("超过 total → 最大 100%", () => {
      expect(calculateBarWidth(25, 20)).toBe(100);
    });
  });

  describe("getBadgeInfo", () => {
    it("ahead > 0 → '🎉 领先 X 题', success", () => {
      const badge = getBadgeInfo(2);
      expect(badge.text).toContain("领先");
      expect(badge.text).toContain("2");
      expect(badge.variant).toBe("success");
    });

    it("ahead = 0 → '👍 同步', info", () => {
      const badge = getBadgeInfo(0);
      expect(badge.text).toContain("同步");
      expect(badge.variant).toBe("info");
    });

    it("ahead = -1 → 仍是 info（边界）", () => {
      const badge = getBadgeInfo(-1);
      expect(badge.variant).toBe("info");
    });

    it("ahead = -2 → warning", () => {
      const badge = getBadgeInfo(-2);
      expect(badge.text).toContain("落后");
      expect(badge.text).toContain("2");
      expect(badge.variant).toBe("warning");
    });

    it("ahead = -3 → warning（边界）", () => {
      const badge = getBadgeInfo(-3);
      expect(badge.variant).toBe("warning");
    });

    it("ahead < -3 → danger", () => {
      const badge = getBadgeInfo(-5);
      expect(badge.text).toContain("落后");
      expect(badge.text).toContain("5");
      expect(badge.variant).toBe("danger");
    });
  });

  describe("实际进度 vs 计划进度对比", () => {
    it("actual > expected → 实际条更长", () => {
      const actualWidth = calculateBarWidth(12, 20); // 60%
      const expectedWidth = calculateBarWidth(10, 20); // 50%
      expect(actualWidth).toBeGreaterThan(expectedWidth);
    });

    it("actual < expected → 计划条更长", () => {
      const actualWidth = calculateBarWidth(5, 20); // 25%
      const expectedWidth = calculateBarWidth(10, 20); // 50%
      expect(actualWidth).toBeLessThan(expectedWidth);
    });

    it("actual = expected → 两条等长", () => {
      const actualWidth = calculateBarWidth(10, 20);
      const expectedWidth = calculateBarWidth(10, 20);
      expect(actualWidth).toBe(expectedWidth);
    });
  });
});
