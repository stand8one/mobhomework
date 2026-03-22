import {
  generateChildFeedback,
  determinePlanStatus,
  shouldNotifyParentForLag,
  shouldNotifyParentForLeave,
  isSessionComplete,
} from "../logic";

describe("CF-3: 四级反馈计算", () => {
  describe("determinePlanStatus", () => {
    it("delta > 0 → ahead", () => {
      expect(determinePlanStatus(1)).toBe("ahead");
      expect(determinePlanStatus(5)).toBe("ahead");
    });

    it("delta = 0 → on_track", () => {
      expect(determinePlanStatus(0)).toBe("on_track");
    });

    it("delta = -1 → on_track（边界）", () => {
      expect(determinePlanStatus(-1)).toBe("on_track");
    });

    it("delta = -2 → slightly_behind", () => {
      expect(determinePlanStatus(-2)).toBe("slightly_behind");
    });

    it("delta = -3 → slightly_behind（边界）", () => {
      expect(determinePlanStatus(-3)).toBe("slightly_behind");
    });

    it("delta = -4 → significantly_behind", () => {
      expect(determinePlanStatus(-4)).toBe("significantly_behind");
    });

    it("delta = -10 → significantly_behind", () => {
      expect(determinePlanStatus(-10)).toBe("significantly_behind");
    });
  });

  describe("generateChildFeedback", () => {
    it("ahead → 鼓励消息，包含具体超前题数", () => {
      const msg = generateChildFeedback("ahead", 3);
      expect(msg).toContain("3");
      expect(msg).toContain("🎉");
      // 不应包含惩罚性语言
      expect(msg).not.toContain("差");
      expect(msg).not.toContain("落后");
    });

    it("on_track → 节奏很好", () => {
      const msg = generateChildFeedback("on_track", 0);
      expect(msg).toContain("节奏很好");
      expect(msg).toContain("👍");
    });

    it("slightly_behind → 加把劲，包含落后题数", () => {
      const msg = generateChildFeedback("slightly_behind", -2);
      expect(msg).toContain("2");
      expect(msg).toContain("💪");
      // 不应使用 Math.abs 失败导致负数出现
      expect(msg).not.toContain("-2");
    });

    it("significantly_behind → 温柔鼓励，不惩罚", () => {
      const msg = generateChildFeedback("significantly_behind", -5);
      expect(msg).toContain("❤️");
      // 设计原则：不含惩罚性语气
      expect(msg).not.toContain("不好");
      expect(msg).not.toContain("差");
      expect(msg).not.toContain("惩罚");
    });

    it("未知状态 → 默认消息不崩溃", () => {
      const msg = generateChildFeedback("unknown_status", 0);
      expect(msg).toBeTruthy();
      expect(msg.length).toBeGreaterThan(0);
    });
  });
});

describe("CF-4: 是否通知家长（进度落后）", () => {
  it("significantly_behind + significantLag:true → 通知", () => {
    expect(shouldNotifyParentForLag("significantly_behind", { significantLag: true })).toBe(true);
  });

  it("slightly_behind → 不通知", () => {
    expect(shouldNotifyParentForLag("slightly_behind", { significantLag: true })).toBe(false);
  });

  it("ahead → 不通知", () => {
    expect(shouldNotifyParentForLag("ahead", { significantLag: true })).toBe(false);
  });

  it("significantly_behind + significantLag:false → 不通知", () => {
    expect(shouldNotifyParentForLag("significantly_behind", { significantLag: false })).toBe(false);
  });

  it("settings 无此字段 → 不通知", () => {
    expect(shouldNotifyParentForLag("significantly_behind", {})).toBe(false);
  });
});

describe("CF-7: 离开检测→通知家长", () => {
  it("left_desk + prolongedLeave:true → 通知", () => {
    expect(shouldNotifyParentForLeave(["left_desk"], { prolongedLeave: true })).toBe(true);
  });

  it("left_desk + prolongedLeave:false → 不通知", () => {
    expect(shouldNotifyParentForLeave(["left_desk"], { prolongedLeave: false })).toBe(false);
  });

  it("无 left_desk 异常 → 不通知", () => {
    expect(shouldNotifyParentForLeave(["stalled"], { prolongedLeave: true })).toBe(false);
  });

  it("空异常列表 → 不通知", () => {
    expect(shouldNotifyParentForLeave([], { prolongedLeave: true })).toBe(false);
  });

  it("多个异常含 left_desk → 通知", () => {
    expect(shouldNotifyParentForLeave(["stalled", "left_desk", "frequent_erasing"], { prolongedLeave: true })).toBe(true);
  });
});

describe("CF-8: 全部完成判断", () => {
  it("completed >= total → 完成", () => {
    expect(isSessionComplete(20, 20)).toBe(true);
  });

  it("completed > total → 也是完成", () => {
    expect(isSessionComplete(21, 20)).toBe(true);
  });

  it("completed < total → 未完成", () => {
    expect(isSessionComplete(19, 20)).toBe(false);
  });

  it("total = 0 → 未完成（边界保护）", () => {
    expect(isSessionComplete(0, 0)).toBe(false);
  });
});
