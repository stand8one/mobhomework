"use client";

interface Analysis {
  id: string;
  analyzedAt: { toDate?: () => Date } | null;
  overallProgress: {
    completed: number;
    inProgress: number;
    total: number;
  };
  planComparison: {
    status: string;
    delta: number;
    actualCompleted: number;
    expectedCompleted: number;
  };
  feedbackToChild: string;
  anomalies: string[];
  sceneDescription: string;
}

const statusEmojis: Record<string, string> = {
  ahead: "🎉",
  on_track: "👍",
  slightly_behind: "💪",
  significantly_behind: "❤️",
};

export default function Timeline({
  analyses,
  totalQuestions,
}: {
  analyses: Analysis[];
  totalQuestions: number;
}) {
  if (!analyses.length) {
    return <p style={{ color: "#94a3b8", textAlign: "center" }}>暂无采集记录</p>;
  }

  return (
    <div className="timeline">
      {analyses.map((a, index) => {
        const time = a.analyzedAt?.toDate?.()
          ? a.analyzedAt.toDate().toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : `采集 ${index + 1}`;

        const progress = a.overallProgress;
        const plan = a.planComparison;
        const emoji = statusEmojis[plan?.status] || "📊";
        const progressPercent = totalQuestions > 0
          ? Math.round((progress.completed / totalQuestions) * 100)
          : 0;

        return (
          <div key={a.id} className="timeline-item">
            <div className="timeline-dot" />
            {index < analyses.length - 1 && <div className="timeline-line" />}

            <div className="timeline-content">
              <div className="timeline-time">{time}</div>
              <div className="timeline-progress">
                <span className="emoji">{emoji}</span>
                <span className="completed">
                  {progress.completed}/{totalQuestions} 题
                </span>
                <div className="progress-bar-mini">
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {a.feedbackToChild && (
                <div className="timeline-feedback">{a.feedbackToChild}</div>
              )}

              {a.anomalies?.length > 0 && (
                <div className="timeline-anomaly">
                  ⚠️ {a.anomalies.join(", ")}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <style jsx>{`
        .timeline {
          position: relative;
          padding-left: 24px;
        }

        .timeline-item {
          position: relative;
          padding-bottom: 20px;
        }

        .timeline-dot {
          position: absolute;
          left: -24px;
          top: 4px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: 2px solid white;
          box-shadow: 0 0 0 3px #e0e7ff;
        }

        .timeline-line {
          position: absolute;
          left: -19px;
          top: 16px;
          bottom: 0;
          width: 2px;
          background: #e2e8f0;
        }

        .timeline-content {
          background: #f8fafc;
          border-radius: 12px;
          padding: 12px 16px;
        }

        .timeline-time {
          font-size: 12px;
          color: #6366f1;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .timeline-progress {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .emoji {
          font-size: 16px;
        }

        .completed {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          white-space: nowrap;
        }

        .progress-bar-mini {
          flex: 1;
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
          border-radius: 3px;
          transition: width 0.5s ease;
        }

        .timeline-feedback {
          font-size: 13px;
          color: #475569;
          margin-top: 4px;
        }

        .timeline-anomaly {
          font-size: 12px;
          color: #f59e0b;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
