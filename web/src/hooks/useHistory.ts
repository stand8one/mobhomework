"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface HistorySession {
  id: string;
  date: string;
  efficiencyStars: number;
  totalQuestions: number;
  completedQuestions: number;
  totalEstimatedMinutes: number;
  actualMinutes: number;
  aheadOfPlan: number;
}

/**
 * 获取历史 sessions 用于趋势图
 */
export function useHistory(userId: string | null, days: number = 30) {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const q = query(
      collection(db, `users/${userId}/sessions`),
      where("status", "==", "completed"),
      orderBy("completedAt", "asc"),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          date: d.completedAt?.toDate?.()?.toLocaleDateString("zh-CN", {
            month: "short", day: "numeric",
          }) || "",
          efficiencyStars: d.efficiencyStars || 0,
          totalQuestions: d.totalQuestions || 0,
          completedQuestions: d.completedQuestions || 0,
          totalEstimatedMinutes: d.totalEstimatedMinutes || 0,
          actualMinutes: d.actualMinutes || 0,
          aheadOfPlan: d.aheadOfPlan || 0,
        };
      });
      setSessions(data);
      setLoading(false);
    });

    return () => unsub();
  }, [userId, days]);

  return { sessions, loading };
}
