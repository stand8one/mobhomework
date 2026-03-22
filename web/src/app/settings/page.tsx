"use client";

import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

interface Settings {
  pomodoroWorkMinutes: number;
  pomodoroBreakMinutes: number;
  captureIntervalMinutes: number;
  notifications: {
    significantLag: boolean;
    prolongedLeave: boolean;
    sessionComplete: boolean;
  };
}

const defaultSettings: Settings = {
  pomodoroWorkMinutes: 20,
  pomodoroBreakMinutes: 5,
  captureIntervalMinutes: 3,
  notifications: {
    significantLag: true,
    prolongedLeave: true,
    sessionComplete: true,
  },
};

export default function SettingsPage() {
  const { userId } = useAuth();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // TODO: Load current settings from Firestore on mount

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, `users/${userId}`), {
        settings,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateNotif = (key: keyof Settings["notifications"], value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
  };

  return (
    <main className="settings-page">
      <header>
        <a href="/" className="back-link">← 返回看板</a>
        <h1>⚙️ 设置</h1>
      </header>

      <section className="setting-group">
        <h3>🍅 番茄钟</h3>

        <div className="setting-row">
          <label>专注时长</label>
          <div className="input-group">
            <input
              type="number"
              min={5}
              max={60}
              value={settings.pomodoroWorkMinutes}
              onChange={(e) => updateSetting("pomodoroWorkMinutes", Number(e.target.value))}
            />
            <span>分钟</span>
          </div>
        </div>

        <div className="setting-row">
          <label>休息时长</label>
          <div className="input-group">
            <input
              type="number"
              min={1}
              max={30}
              value={settings.pomodoroBreakMinutes}
              onChange={(e) => updateSetting("pomodoroBreakMinutes", Number(e.target.value))}
            />
            <span>分钟</span>
          </div>
        </div>
      </section>

      <section className="setting-group">
        <h3>📷 采集设置</h3>

        <div className="setting-row">
          <label>拍照间隔</label>
          <div className="input-group">
            <input
              type="number"
              min={1}
              max={10}
              value={settings.captureIntervalMinutes}
              onChange={(e) => updateSetting("captureIntervalMinutes", Number(e.target.value))}
            />
            <span>分钟</span>
          </div>
        </div>
      </section>

      <section className="setting-group">
        <h3>🔔 通知偏好</h3>

        <div className="setting-row">
          <label>进度明显落后</label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.notifications.significantLag}
              onChange={(e) => updateNotif("significantLag", e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="setting-row">
          <label>长时间离开</label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.notifications.prolongedLeave}
              onChange={(e) => updateNotif("prolongedLeave", e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="setting-row">
          <label>作业全部完成</label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.notifications.sessionComplete}
              onChange={(e) => updateNotif("sessionComplete", e.target.checked)}
            />
            <span className="slider" />
          </label>
        </div>
      </section>

      <button
        className={`save-btn ${saved ? "saved" : ""}`}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "保存中..." : saved ? "✅ 已保存" : "保存设置"}
      </button>

      <style jsx>{`
        .settings-page {
          max-width: 560px;
          margin: 0 auto;
          padding: 20px;
          font-family: 'Noto Sans SC', 'Inter', sans-serif;
          background: linear-gradient(135deg, #f0f4ff 0%, #fef6ff 100%);
          min-height: 100vh;
        }

        header {
          margin-bottom: 24px;
        }

        .back-link {
          color: #6366f1;
          text-decoration: none;
          font-size: 14px;
        }

        h1 {
          margin: 8px 0 0;
          font-size: 24px;
        }

        .setting-group {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }

        .setting-group h3 {
          font-size: 16px;
          margin: 0 0 16px;
          color: #1e293b;
        }

        .setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #f8fafc;
        }

        .setting-row:last-child {
          border-bottom: none;
        }

        .setting-row label {
          font-size: 14px;
          color: #475569;
        }

        .input-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .input-group input {
          width: 60px;
          padding: 6px 10px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          text-align: center;
          outline: none;
          transition: border-color 0.2s;
        }

        .input-group input:focus {
          border-color: #6366f1;
        }

        .input-group span {
          font-size: 13px;
          color: #94a3b8;
        }

        .toggle {
          position: relative;
          width: 48px;
          height: 26px;
          cursor: pointer;
        }

        .toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          inset: 0;
          background: #cbd5e1;
          border-radius: 13px;
          transition: background 0.3s;
        }

        .slider::before {
          content: "";
          position: absolute;
          bottom: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        .toggle input:checked + .slider {
          background: #6366f1;
        }

        .toggle input:checked + .slider::before {
          transform: translateX(22px);
        }

        .save-btn {
          display: block;
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .save-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(99,102,241,0.4);
        }

        .save-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .save-btn.saved {
          background: #22c55e;
        }
      `}</style>
    </main>
  );
}
