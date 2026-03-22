import { calculateStars } from "../logic";

describe("CF-6: 效率星级计算", () => {
  describe("calculateStars", () => {
    it("领先 20%+ → 5 星", () => {
      // delta=4, total=20 → ratio=0.2 → 5 星
      expect(calculateStars(4, 20)).toBe(5);
    });

    it("领先 25% → 5 星", () => {
      expect(calculateStars(5, 20)).toBe(5);
    });

    it("领先 5%+ → 4 星", () => {
      // delta=1, total=20 → ratio=0.05 → 4 星
      expect(calculateStars(1, 20)).toBe(4);
    });

    it("领先 10% → 4 星", () => {
      expect(calculateStars(2, 20)).toBe(4);
    });

    it("基本同步 → 3 星", () => {
      // delta=0, total=20 → ratio=0 → 3 星
      expect(calculateStars(0, 20)).toBe(3);
    });

    it("微微落后 -1 题 / 20 题 → 3 星", () => {
      // ratio = -0.05 → 刚好 >= -0.05
      expect(calculateStars(-1, 20)).toBe(3);
    });

    it("落后 15% → 2 星", () => {
      // delta=-3, total=20 → ratio=-0.15 → 2 星
      expect(calculateStars(-3, 20)).toBe(2);
    });

    it("落后 20% → 2 星（边界值）", () => {
      // delta=-4, total=20 → ratio=-0.2 → 刚好 >= -0.2
      expect(calculateStars(-4, 20)).toBe(2);
    });

    it("落后 25%+ → 1 星", () => {
      // delta=-5, total=20 → ratio=-0.25 → 1 星
      expect(calculateStars(-5, 20)).toBe(1);
    });

    it("total=0 不除零 → 不崩溃", () => {
      // Math.max(0, 1) = 1 → ratio = 0 → 3 星
      expect(calculateStars(0, 0)).toBe(3);
    });

    it("total=1 小 session", () => {
      expect(calculateStars(1, 1)).toBe(5); // ratio=1.0
      expect(calculateStars(0, 1)).toBe(3); // ratio=0
      expect(calculateStars(-1, 1)).toBe(1); // ratio=-1.0
    });
  });
});
