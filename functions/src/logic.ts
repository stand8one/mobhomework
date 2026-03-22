/**
 * 纯业务逻辑函数
 * 从 onCaptureCreated 中提取，方便单元测试
 */

/**
 * 生成给孩子的反馈消息
 * 基于进度状态和差值生成正面的鼓励文字
 */
export function generateChildFeedback(planStatus: string, delta: number): string {
  switch (planStatus) {
    case "ahead":
      return `太棒了，你比计划快了 ${delta} 题！继续保持 🎉`;
    case "on_track":
      return "节奏很好，继续保持 👍";
    case "slightly_behind":
      return `加把劲，还差 ${Math.abs(delta)} 题追上计划 💪`;
    case "significantly_behind":
      return "休息一下再继续吧，你已经很棒了 ❤️";
    default:
      return "继续加油！";
  }
}

/**
 * 根据领先/落后差值判断进度状态
 */
export function determinePlanStatus(delta: number): string {
  if (delta > 0) return "ahead";
  if (delta >= -1) return "on_track";
  if (delta >= -3) return "slightly_behind";
  return "significantly_behind";
}

/**
 * 计算效率星级 (1-5)
 * 基于领先/落后比例评定
 */
export function calculateStars(delta: number, totalQuestions: number): number {
  const ratio = delta / Math.max(totalQuestions, 1);
  if (ratio >= 0.2) return 5;   // 领先 20%+
  if (ratio >= 0.05) return 4;  // 领先 5%+
  if (ratio >= -0.05) return 3; // 基本同步
  if (ratio >= -0.2) return 2;  // 落后 20% 以内
  return 1;                     // 落后较多
}

/**
 * 判断是否需要通知家长（进度落后）
 */
export function shouldNotifyParentForLag(
  planStatus: string,
  notificationSettings: { significantLag?: boolean }
): boolean {
  return planStatus === "significantly_behind" && notificationSettings.significantLag === true;
}

/**
 * 判断是否需要通知家长（离开座位）
 */
export function shouldNotifyParentForLeave(
  anomalies: string[],
  notificationSettings: { prolongedLeave?: boolean }
): boolean {
  return anomalies.includes("left_desk") && notificationSettings.prolongedLeave === true;
}

/**
 * 判断是否全部完成
 */
export function isSessionComplete(currentCompleted: number, totalQuestions: number): boolean {
  return totalQuestions > 0 && currentCompleted >= totalQuestions;
}
