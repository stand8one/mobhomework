"use client";

import { useAuth } from "@/hooks/useAuth";
import { useHistory } from "@/hooks/useHistory";
import EfficiencyChart from "@/components/EfficiencyChart";

/**
 * 效率趋势页 — 按天展示历史效率
 */
export default function TrendsPage() {
  const { userId } = useAuth();
  const { sessions, loading } = useHistory(userId, 30);

  const chartData = sessions.map((s) => ({
    date: s.date,
    stars: s.efficiencyStars,
    completionRate:
      s.totalQuestions > 0
        ? Math.round((s.completedQuestions / s.totalQuestions) * 100)
        : 0,
    efficiency:
      s.actualMinutes > 0 ? +(s.completedQuestions / s.actualMinutes).toFixed(2) : 0,
  }));

  return (
    <main className="trends-page">
      <header>
        <a href="/" className="back-link">← 返回看板</a>
        <h1>📈 效率趋势</h1>
        <p className="subtitle">最近 30 天</p>
      </header>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <>
          <section className="chart-card">
            <EfficiencyChart data={chartData} />
          </section>

          {sessions.length > 0 && (
            <section className="stats-summary">
              <div className="stat-card">
                <span className="stat-value">{sessions.length}</span>
                <span className="stat-label">作业次数</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">
                  {(sessions.reduce((sum, s) => sum + s.efficiencyStars, 0) / sessions.length).toFixed(1)}
                </span>
                <span className="stat-label">平均星级</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">
                  {Math.round(
                    sessions.reduce((sum, s) => sum + (s.totalQuestions > 0 ? s.completedQuestions / s.totalQuestions * 100 : 0), 0) / sessions.length
                  )}%
                </span>
                <span className="stat-label">平均完成率</span>
              </div>
            </section>
          )}

          <section className="history-list">
            <h3>历史记录</h3>
            {sessions.map((s) => (
              <a key={s.id} href={`/report/${s.id}`} className="history-item">
                <span className="history-date">{s.date}</span>
                <span className="history-stars">{"⭐".repeat(s.efficiencyStars)}</span>
                <span className="history-questions">{s.completedQuestions}/{s.totalQuestions} 题</span>
              </a>
            ))}
          </section>
        </>
      )}

      <style jsx>{`
        .trends-page {
          max-width: 680px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Noto Sans SC', 'Inter', sans-serif;
          background: linear-gradient(135deg, #f0f4ff 0%, #fef6ff 100%);
          min-height: 100vh;
        }
        header { margin-bottom: 24px; }
        .back-link { color: #6366f1; text-decoration: none; font-size: 14px; }
        h1 { margin: 8px 0 4px; font-size: 24px; }
        .subtitle { color: #64748b; font-size: 14px; }
        .loading { text-align: center; padding: 60px; color: #94a3b8; }
        .chart-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .stats-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .stat-value {
          display: block;
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
        }
        .stat-label {
          font-size: 12px;
          color: #94a3b8;
        }
        .history-list {
          background: white;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .history-list h3 {
          font-size: 16px;
          margin-bottom: 12px;
        }
        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #f1f5f9;
          text-decoration: none;
          color: inherit;
          transition: background 0.2s;
        }
        .history-item:hover { background: #f8fafc; border-radius: 8px; padding: 10px 8px; }
        .history-item:last-child { border-bottom: none; }
        .history-date { font-size: 14px; color: #475569; min-width: 80px; }
        .history-stars { font-size: 14px; }
        .history-questions { font-size: 13px; color: #94a3b8; }
      `}</style>
    </main>
  );
}
