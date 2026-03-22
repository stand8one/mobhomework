"use client";

interface Question {
  id: string;
  questionIndex: number;
  label: string;
  type: string;
  status: "unanswered" | "in_progress" | "completed";
  estimatedMinutes: number;
  actualMinutes?: number;
}

const statusConfig: Record<string, { icon: string; label: string; color: string }> = {
  completed: { icon: "✅", label: "已完成", color: "#22c55e" },
  in_progress: { icon: "✏️", label: "进行中", color: "#f59e0b" },
  unanswered: { icon: "⬜", label: "未开始", color: "#94a3b8" },
};

export default function QuestionList({ questions }: { questions: Question[] }) {
  if (!questions.length) {
    return <p style={{ color: "#94a3b8", textAlign: "center" }}>暂无题目数据</p>;
  }

  return (
    <div className="question-list">
      {questions.map((q) => {
        const config = statusConfig[q.status] || statusConfig.unanswered;
        return (
          <div key={q.id} className="question-item">
            <span className="question-icon">{config.icon}</span>
            <div className="question-info">
              <span className="question-label">{q.label || `第${q.questionIndex}题`}</span>
              <span className="question-type">{q.type}</span>
            </div>
            <div className="question-time">
              {q.actualMinutes
                ? `${q.actualMinutes}/${q.estimatedMinutes}min`
                : `预估 ${q.estimatedMinutes}min`}
            </div>
          </div>
        );
      })}

      <style jsx>{`
        .question-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .question-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          background: #f8fafc;
          transition: background 0.2s;
        }
        .question-item:hover {
          background: #f1f5f9;
        }
        .question-icon {
          font-size: 18px;
          width: 24px;
          text-align: center;
        }
        .question-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .question-label {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }
        .question-type {
          font-size: 12px;
          color: #94a3b8;
        }
        .question-time {
          font-size: 12px;
          color: #64748b;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
