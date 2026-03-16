"use client";

import React from "react";

interface ProgressRaceBarProps {
  totalQuestions: number;
  completedQuestions: number;
  expectedCompleted: number;
  aheadOfPlan: number;
}

/**
 * 双轨进度赛跑条
 * 上方: 预估计划线（匀速推进）
 * 下方: 实际进度线
 */
export default function ProgressRaceBar({
  totalQuestions,
  completedQuestions,
  expectedCompleted,
  aheadOfPlan,
}: ProgressRaceBarProps) {
  const planPercent = totalQuestions > 0 ? (expectedCompleted / totalQuestions) * 100 : 0;
  const actualPercent = totalQuestions > 0 ? (completedQuestions / totalQuestions) * 100 : 0;

  const isAhead = aheadOfPlan > 0;
  const isOnTrack = aheadOfPlan >= -1 && aheadOfPlan <= 0;

  return (
    <div className="progress-race-bar">
      {/* 计划线 */}
      <div className="track">
        <div className="track-label">📋 计划</div>
        <div className="track-bar">
          <div
            className="track-fill plan"
            style={{ width: `${Math.min(planPercent, 100)}%` }}
          />
        </div>
        <div className="track-value">{expectedCompleted}/{totalQuestions}</div>
      </div>

      {/* 实际线 */}
      <div className="track">
        <div className="track-label">✏️ 实际</div>
        <div className="track-bar">
          <div
            className={`track-fill actual ${isAhead ? "ahead" : isOnTrack ? "on-track" : "behind"}`}
            style={{ width: `${Math.min(actualPercent, 100)}%` }}
          />
        </div>
        <div className="track-value">{completedQuestions}/{totalQuestions}</div>
      </div>

      {/* 差值提示 */}
      <div className={`delta-badge ${isAhead ? "ahead" : isOnTrack ? "on-track" : "behind"}`}>
        {isAhead
          ? `🎉 领先 ${aheadOfPlan} 题`
          : isOnTrack
          ? `👍 进度同步`
          : `💪 落后 ${Math.abs(aheadOfPlan)} 题`}
      </div>

      <style jsx>{`
        .progress-race-bar {
          background: var(--card-bg, #1a1a2e);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .track {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .track-label {
          font-size: 14px;
          min-width: 60px;
          color: var(--text-secondary, #a0a0b0);
        }
        .track-bar {
          flex: 1;
          height: 12px;
          background: var(--bar-bg, rgba(255,255,255,0.08));
          border-radius: 6px;
          overflow: hidden;
        }
        .track-fill {
          height: 100%;
          border-radius: 6px;
          transition: width 0.6s ease;
        }
        .track-fill.plan {
          background: linear-gradient(90deg, #4a5568, #718096);
        }
        .track-fill.actual.ahead {
          background: linear-gradient(90deg, #38b2ac, #4fd1c5);
        }
        .track-fill.actual.on-track {
          background: linear-gradient(90deg, #4299e1, #63b3ed);
        }
        .track-fill.actual.behind {
          background: linear-gradient(90deg, #ed8936, #f6ad55);
        }
        .track-value {
          font-size: 14px;
          font-weight: 600;
          min-width: 50px;
          text-align: right;
          color: var(--text-primary, #e0e0e8);
        }
        .delta-badge {
          text-align: center;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
        }
        .delta-badge.ahead {
          background: rgba(56, 178, 172, 0.15);
          color: #4fd1c5;
        }
        .delta-badge.on-track {
          background: rgba(66, 153, 225, 0.15);
          color: #63b3ed;
        }
        .delta-badge.behind {
          background: rgba(237, 137, 54, 0.15);
          color: #f6ad55;
        }
      `}</style>
    </div>
  );
}
