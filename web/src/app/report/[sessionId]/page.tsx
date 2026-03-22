"use client";

import { useAuth } from "@/hooks/useAuth";
import { useReport } from "@/hooks/useReport";
import Timeline from "@/components/Timeline";
import QuestionList from "@/components/QuestionList";

export default function ReportPage({ params }: { params: { sessionId: string } }) {
  const { userId } = useAuth();
  const { session, questions, analyses, loading } = useReport(userId, params.sessionId);

  if (loading) {
    return (
      <main className="report">
        <div className="loading">加载报告中...</div>
        <style jsx>{styles}</style>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="report">
        <div className="empty">未找到该作业记录</div>
        <style jsx>{styles}</style>
      </main>
    );
  }

  const summary = session.summary;
  const reward = session.reward;

  return (
    <main className="report">
      <header className="report-header">
        <a href="/" className="back-link">← 返回看板</a>
        <h1>📝 作业报告</h1>
        <p className="date">{session.date}</p>
      </header>

      {/* 总结卡片 */}
      <section className="summary-card">
        <div className="stats-row">
          <div className="stat">
            <span className="stat-value">{session.completedQuestions}/{session.totalQuestions}</span>
            <span className="stat-label">完成题数</span>
          </div>
          <div className="stat">
            <span className="stat-value">{session.actualMinutes || "—"} 分钟</span>
            <span className="stat-label">实际用时</span>
          </div>
          <div className="stat">
            <span className="stat-value">{"⭐".repeat(session.efficiencyStars || 0)}</span>
            <span className="stat-label">效率星级</span>
          </div>
        </div>

        {summary && (
          <div className="ai-summary">
            <h3>🤖 AI 总结</h3>
            <p>{summary.text}</p>

            {summary.highlights?.length > 0 && (
              <div className="highlights">
                <h4>🌟 亮点</h4>
                <ul>
                  {summary.highlights.map((h: string, i: number) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {summary.suggestions?.length > 0 && (
              <div className="suggestions">
                <h4>💡 建议</h4>
                <ul>
                  {summary.suggestions.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 奖励展示 */}
      {reward && (
        <section className="reward-card">
          <h3>🏆 本次奖励</h3>
          <div className="reward-points">+{reward.points} 积分</div>
          {reward.isPersonalBest && (
            <div className="personal-best">🎉 个人最佳效率！</div>
          )}
          {reward.achievements?.length > 0 && (
            <div className="achievements">
              {reward.achievements.map((a: string, i: number) => (
                <span key={i} className="achievement-badge">
                  {achievementLabels[a] || a}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 题目列表 */}
      <section className="questions-section">
        <h3>📋 题目详情</h3>
        <QuestionList questions={questions} />
      </section>

      {/* 时间线回放 */}
      <section className="timeline-section">
        <h3>⏱️ 时间线</h3>
        <Timeline analyses={analyses} totalQuestions={session.totalQuestions} />
      </section>

      <style jsx>{styles}</style>
    </main>
  );
}

const achievementLabels: Record<string, string> = {
  streak_3_ahead: "🔥 连续领先3次",
  streak_5_ahead: "💎 连续领先5次",
  first_5_stars: "⭐ 首次5星",
  "10_sessions_completed": "🎯 完成10次作业",
  "50_sessions_completed": "🏅 完成50次作业",
};

const styles = `
  .report {
    max-width: 680px;
    margin: 0 auto;
    padding: 20px;
    font-family: 'Noto Sans SC', 'Inter', sans-serif;
    background: linear-gradient(135deg, #f0f4ff 0%, #fef6ff 100%);
    min-height: 100vh;
  }

  .report-header {
    margin-bottom: 24px;
  }

  .back-link {
    color: #6366f1;
    text-decoration: none;
    font-size: 14px;
  }

  .report-header h1 {
    margin: 8px 0 4px;
    font-size: 24px;
  }

  .date {
    color: #64748b;
    font-size: 14px;
  }

  .summary-card, .reward-card, .questions-section, .timeline-section {
    background: white;
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 16px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  }

  .stats-row {
    display: flex;
    justify-content: space-around;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f1f5f9;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 700;
    color: #1e293b;
  }

  .stat-label {
    font-size: 12px;
    color: #94a3b8;
  }

  .ai-summary h3 {
    font-size: 16px;
    margin-bottom: 8px;
  }

  .ai-summary p {
    color: #475569;
    line-height: 1.6;
  }

  .highlights, .suggestions {
    margin-top: 12px;
  }

  .highlights h4, .suggestions h4 {
    font-size: 14px;
    margin-bottom: 4px;
  }

  .highlights ul, .suggestions ul {
    list-style: none;
    padding: 0;
  }

  .highlights li, .suggestions li {
    padding: 4px 0;
    color: #475569;
    font-size: 14px;
  }

  .highlights li::before {
    content: "✓ ";
    color: #22c55e;
  }

  .suggestions li::before {
    content: "→ ";
    color: #f59e0b;
  }

  .reward-card {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    text-align: center;
  }

  .reward-points {
    font-size: 28px;
    font-weight: 800;
    color: #b45309;
    margin: 8px 0;
  }

  .personal-best {
    font-size: 16px;
    color: #d97706;
    margin-bottom: 8px;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  .achievement-badge {
    display: inline-block;
    background: rgba(255,255,255,0.7);
    padding: 4px 12px;
    border-radius: 20px;
    margin: 4px;
    font-size: 13px;
    font-weight: 600;
  }

  .loading, .empty {
    text-align: center;
    padding: 60px 20px;
    color: #94a3b8;
    font-size: 16px;
  }
`;
