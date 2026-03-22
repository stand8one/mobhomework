"use client";

import { useSession } from "@/hooks/useSession";
import ProgressRaceBar from "@/components/ProgressRaceBar";
import StatusBanner from "@/components/StatusBanner";

/**
 * 家长看板 - 首页
 * 一进来就看到今天的作业进度
 */
export default function DashboardPage() {
  // TODO: 替换为实际的 auth userId
  const userId = null;
  const { session, analyses, events, loading } = useSession(userId);

  if (loading) {
    return (
      <main className="dashboard">
        <div className="loading">加载中...</div>
        <style jsx>{dashboardStyles}</style>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="dashboard">
        <div className="hero">
          <h1>📚 作业成长助手</h1>
          <p>让孩子看见自己的进度，建立「我能行」的自信</p>
          <button className="btn-primary">登录</button>
        </div>
        <style jsx>{dashboardStyles}</style>
      </main>
    );
  }

  const latestAnalysis = analyses[0];
  const planStatus = latestAnalysis?.planComparison?.status || "on_track";
  const expectedCompleted = latestAnalysis?.planComparison?.expectedCompleted || 0;

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <h1>📚 作业成长助手</h1>
        <span className="date">{new Date().toLocaleDateString("zh-CN", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        })}</span>
      </header>

      {/* 导航栏 */}
      <nav className="nav-bar">
        {session && (
          <a href={`/report/${session.id}`} className="nav-link">📝 报告</a>
        )}
        <a href="/trends" className="nav-link">📈 趋势</a>
        <a href="/settings" className="nav-link">⚙️ 设置</a>
        <a href="/child" className="nav-link">👧 孩子视图</a>
      </nav>

      {/* 一句话状态 */}
      <StatusBanner
        status={session ? (session.status === "completed" ? "completed" : "in_progress") : "no_session"}
        completedQuestions={session?.completedQuestions || 0}
        totalQuestions={session?.totalQuestions || 0}
        planStatus={planStatus}
      />

      {/* 进度赛跑条 */}
      {session && (
        <ProgressRaceBar
          totalQuestions={session.totalQuestions}
          completedQuestions={session.completedQuestions}
          expectedCompleted={expectedCompleted}
          aheadOfPlan={session.aheadOfPlan}
        />
      )}

      {/* 预计完成时间 */}
      {session && session.status === "in_progress" && (
        <div className="eta-card">
          <span className="eta-label">预计完成时间</span>
          <span className="eta-value">
            {estimateCompletion(session.totalQuestions, session.completedQuestions, session.totalEstimatedMinutes, session.startedAt)}
          </span>
        </div>
      )}

      {/* 异常事件流 */}
      {events.length > 0 && (
        <div className="events-card">
          <h3>📋 事件</h3>
          <ul>
            {events.slice(0, 5).map((event) => (
              <li key={event.id} className={`event-item ${event.type}`}>
                <span className="event-time">
                  {event.timestamp?.toDate().toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="event-message">{event.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <style jsx>{dashboardStyles}</style>
    </main>
  );
}

function estimateCompletion(
  total: number,
  completed: number,
  estimatedMinutes: number,
  startedAt: { toDate: () => Date } | null
): string {
  if (!startedAt || completed === 0) return "计算中...";

  const elapsed = (Date.now() - startedAt.toDate().getTime()) / 60000;
  const rate = completed / elapsed;
  const remaining = total - completed;
  const etaMinutes = remaining / rate;

  const etaTime = new Date(Date.now() + etaMinutes * 60000);
  return etaTime.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

const dashboardStyles = `
  .dashboard {
    max-width: 640px;
    margin: 0 auto;
    padding: 24px 16px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .dashboard-header h1 {
    font-size: 24px;
    font-weight: 700;
  }
  .nav-bar {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .nav-link {
    padding: 8px 16px;
    border-radius: 20px;
    background: var(--bg-card, #1e293b);
    color: var(--text-primary, #e2e8f0);
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    transition: all 0.2s;
  }
  .nav-link:hover {
    background: var(--accent-teal, #4fd1c5);
    color: white;
  }
  .date {
    font-size: 14px;
    color: var(--text-secondary);
  }
  .hero {
    text-align: center;
    padding: 80px 20px;
  }
  .hero h1 {
    font-size: 36px;
    margin-bottom: 12px;
  }
  .hero p {
    font-size: 18px;
    color: var(--text-secondary);
    margin-bottom: 32px;
  }
  .btn-primary {
    background: linear-gradient(135deg, #4fd1c5, #38b2ac);
    color: white;
    border: none;
    padding: 14px 40px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(79, 209, 197, 0.3);
  }
  .loading {
    text-align: center;
    padding: 80px;
    color: var(--text-secondary);
  }
  .eta-card {
    background: var(--bg-card);
    border-radius: 16px;
    padding: 20px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .eta-label {
    color: var(--text-secondary);
    font-size: 14px;
  }
  .eta-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--accent-teal);
  }
  .events-card {
    background: var(--bg-card);
    border-radius: 16px;
    padding: 20px 24px;
  }
  .events-card h3 {
    margin-bottom: 12px;
    font-size: 16px;
  }
  .events-card ul {
    list-style: none;
  }
  .event-item {
    display: flex;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .event-item:last-child { border-bottom: none; }
  .event-time {
    color: var(--text-secondary);
    font-size: 13px;
    min-width: 50px;
  }
  .event-message { font-size: 14px; }
  .event-item.anomaly .event-message { color: var(--accent-orange); }
  .event-item.milestone .event-message { color: var(--accent-green); }
`;
