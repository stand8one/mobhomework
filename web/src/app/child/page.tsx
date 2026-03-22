"use client";

import React from "react";
import { useSession } from "@/hooks/useSession";
import { useAuth } from "@/hooks/useAuth";
import ProgressRaceBar from "@/components/ProgressRaceBar";

/**
 * 孩子进度页 - 番茄钟休息时用手机/平板浏览器查看
 * 设计原则：极简，只有进度条和数字，不分散注意力
 */
export default function ChildProgressPage() {
  const { userId } = useAuth();
  const { session, analyses, loading } = useSession(userId);

  if (loading) {
    return (
      <main className="child-page">
        <div className="loading-text">加载中...</div>
        <style jsx>{styles}</style>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="child-page">
        <div className="empty-state">
          <span className="emoji">📚</span>
          <p>今天还没有开始写作业哦</p>
        </div>
        <style jsx>{styles}</style>
      </main>
    );
  }

  const latestAnalysis = analyses[0];
  const expectedCompleted = latestAnalysis?.planComparison?.expectedCompleted || 0;
  const delta = session.aheadOfPlan;
  const isAhead = delta > 0;
  const isOnTrack = delta >= -1 && delta <= 0;
  const completed = session.completedQuestions;
  const total = session.totalQuestions;

  // 全部完成
  if (session.status === "completed") {
    return (
      <main className="child-page">
        <div className="celebration">
          <span className="big-emoji">🎉</span>
          <h1>全部完成！</h1>
          <p className="completed-count">{total} / {total} 题</p>
          <p className="praise">你太棒了！今天的作业全部搞定！</p>
          {session.efficiencyStars && (
            <div className="stars">
              {"⭐".repeat(session.efficiencyStars)}
            </div>
          )}
        </div>
        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="child-page">
      {/* 大字完成数 */}
      <div className="count-display">
        <span className="count-done">{completed}</span>
        <span className="count-sep">/</span>
        <span className="count-total">{total}</span>
        <span className="count-label">题</span>
      </div>

      {/* 进度赛跑条 */}
      <ProgressRaceBar
        totalQuestions={total}
        completedQuestions={completed}
        expectedCompleted={expectedCompleted}
        aheadOfPlan={delta}
      />

      {/* 反馈文字 */}
      <div className={`feedback ${isAhead ? "ahead" : isOnTrack ? "on-track" : "behind"}`}>
        {isAhead
          ? `太棒了，你比计划快了 ${delta} 题！🎉`
          : isOnTrack
          ? "节奏很好，继续保持 👍"
          : `加油，还差 ${Math.abs(delta)} 题追上计划 💪`
        }
      </div>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .child-page {
    max-width: 480px;
    margin: 0 auto;
    padding: 40px 20px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 32px;
    background: var(--bg-primary, #0f0f1a);
  }
  .loading-text {
    color: var(--text-secondary, #a0a0b0);
    font-size: 18px;
  }
  .empty-state {
    text-align: center;
  }
  .emoji { font-size: 64px; }
  .empty-state p {
    margin-top: 16px;
    font-size: 20px;
    color: var(--text-secondary, #a0a0b0);
  }

  /* 大字完成数 */
  .count-display {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }
  .count-done {
    font-size: 72px;
    font-weight: 800;
    color: var(--accent-teal, #4fd1c5);
  }
  .count-sep {
    font-size: 36px;
    color: var(--text-secondary, #a0a0b0);
    margin: 0 4px;
  }
  .count-total {
    font-size: 36px;
    font-weight: 600;
    color: var(--text-secondary, #a0a0b0);
  }
  .count-label {
    font-size: 24px;
    color: var(--text-secondary, #a0a0b0);
    margin-left: 8px;
  }

  /* 反馈 */
  .feedback {
    font-size: 20px;
    font-weight: 600;
    text-align: center;
    padding: 16px 24px;
    border-radius: 16px;
  }
  .feedback.ahead {
    background: rgba(79, 209, 197, 0.12);
    color: #4fd1c5;
  }
  .feedback.on-track {
    background: rgba(99, 179, 237, 0.12);
    color: #63b3ed;
  }
  .feedback.behind {
    background: rgba(246, 173, 85, 0.12);
    color: #f6ad55;
  }

  /* 完成庆祝 */
  .celebration {
    text-align: center;
  }
  .big-emoji { font-size: 80px; }
  .celebration h1 {
    font-size: 36px;
    margin: 16px 0 8px;
    color: var(--accent-teal, #4fd1c5);
  }
  .completed-count {
    font-size: 24px;
    color: var(--text-secondary, #a0a0b0);
  }
  .praise {
    font-size: 20px;
    margin-top: 12px;
    color: var(--text-primary, #e0e0e8);
  }
  .stars {
    font-size: 32px;
    margin-top: 16px;
  }
`;
