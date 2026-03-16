"use client";

import React from "react";

interface StatusBannerProps {
  status: "no_session" | "in_progress" | "completed";
  completedQuestions: number;
  totalQuestions: number;
  planStatus: string;
  stallMinutes?: number;
}

/**
 * 一句话状态横幅
 * 家长打开页面时第一眼看到的信息
 */
export default function StatusBanner({
  status,
  completedQuestions,
  totalQuestions,
  planStatus,
  stallMinutes,
}: StatusBannerProps) {
  const getMessage = () => {
    if (status === "no_session") {
      return { icon: "📝", text: "今天还没有开始写作业", color: "neutral" };
    }
    if (status === "completed") {
      return { icon: "🎉", text: `今日作业全部完成！共 ${totalQuestions} 题`, color: "success" };
    }

    // in_progress
    switch (planStatus) {
      case "ahead":
        return {
          icon: "✅",
          text: `进度领先，已完成 ${completedQuestions}/${totalQuestions} 题`,
          color: "success",
        };
      case "on_track":
        return {
          icon: "✅",
          text: `进度正常，已完成 ${completedQuestions}/${totalQuestions} 题`,
          color: "info",
        };
      case "slightly_behind":
        return {
          icon: "⏳",
          text: `进度稍慢，已完成 ${completedQuestions}/${totalQuestions} 题`,
          color: "warning",
        };
      case "significantly_behind":
        return {
          icon: "⚠️",
          text: stallMinutes
            ? `进度落后，已停滞 ${stallMinutes} 分钟`
            : `进度落后较多，已完成 ${completedQuestions}/${totalQuestions} 题`,
          color: "danger",
        };
      default:
        return {
          icon: "📝",
          text: `进行中，已完成 ${completedQuestions}/${totalQuestions} 题`,
          color: "info",
        };
    }
  };

  const { icon, text, color } = getMessage();

  return (
    <div className={`status-banner ${color}`}>
      <span className="status-icon">{icon}</span>
      <span className="status-text">{text}</span>

      <style jsx>{`
        .status-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 28px;
          border-radius: 16px;
          font-size: 20px;
          font-weight: 600;
        }
        .status-icon { font-size: 28px; }
        .status-banner.success {
          background: linear-gradient(135deg, rgba(56,178,172,0.15), rgba(79,209,197,0.08));
          color: #4fd1c5;
        }
        .status-banner.info {
          background: linear-gradient(135deg, rgba(66,153,225,0.15), rgba(99,179,237,0.08));
          color: #63b3ed;
        }
        .status-banner.warning {
          background: linear-gradient(135deg, rgba(237,137,54,0.15), rgba(246,173,85,0.08));
          color: #f6ad55;
        }
        .status-banner.danger {
          background: linear-gradient(135deg, rgba(245,101,101,0.15), rgba(252,129,129,0.08));
          color: #fc8181;
        }
        .status-banner.neutral {
          background: rgba(255,255,255,0.05);
          color: var(--text-secondary, #a0a0b0);
        }
      `}</style>
    </div>
  );
}
