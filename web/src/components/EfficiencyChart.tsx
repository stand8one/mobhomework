"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface ChartData {
  date: string;
  stars: number;
  completionRate: number;
  efficiency: number; // questions per minute
}

export default function EfficiencyChart({
  data,
}: {
  data: ChartData[];
}) {
  if (!data.length) {
    return (
      <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px" }}>
        完成更多作业后将显示趋势图 📈
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="chart-section">
        <h4>⭐ 效率星级趋势</h4>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="starGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" fontSize={12} stroke="#94a3b8" />
            <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} fontSize={12} stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "none",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            />
            <Area
              type="monotone"
              dataKey="stars"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#starGradient)"
              name="星级"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-section">
        <h4>📊 完成率趋势</h4>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" fontSize={12} stroke="#94a3b8" />
            <YAxis domain={[0, 100]} unit="%" fontSize={12} stroke="#94a3b8" />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "none",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            />
            <Area
              type="monotone"
              dataKey="completionRate"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#rateGradient)"
              name="完成率"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <style jsx>{`
        .chart-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .chart-section h4 {
          font-size: 14px;
          color: #475569;
          margin-bottom: 12px;
        }
      `}</style>
    </div>
  );
}
