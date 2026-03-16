"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Session {
  id: string;
  date: string;
  status: string;
  startedAt: Timestamp | null;
  completedAt: Timestamp | null;
  totalQuestions: number;
  completedQuestions: number;
  totalEstimatedMinutes: number;
  aheadOfPlan: number;
  efficiencyStars: number | null;
}

interface Analysis {
  id: string;
  analyzedAt: Timestamp;
  planComparison: {
    expectedCompleted: number;
    actualCompleted: number;
    delta: number;
    status: string;
  };
  sceneDescription: string;
  anomalies: string[];
}

interface SessionEvent {
  id: string;
  type: string;
  subType: string;
  timestamp: Timestamp;
  message: string;
}

/**
 * 实时监听今日 Session 及其分析和事件
 */
export function useSession(userId: string | null) {
  const [session, setSession] = useState<Session | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取今日日期
  const today = new Date().toISOString().split("T")[0];

  // 监听今日 session
  useEffect(() => {
    if (!userId) return;

    const sessionsRef = collection(db, `users/${userId}/sessions`);
    const q = query(
      sessionsRef,
      where("date", "==", today),
      orderBy("startedAt", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setSession(null);
        setLoading(false);
        return;
      }
      const docSnap = snapshot.docs[0];
      setSession({ id: docSnap.id, ...docSnap.data() } as Session);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId, today]);

  // 监听分析结果
  useEffect(() => {
    if (!userId || !session?.id) return;

    const analysesRef = collection(
      db,
      `users/${userId}/sessions/${session.id}/analyses`
    );
    const q = query(analysesRef, orderBy("analyzedAt", "desc"), limit(20));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Analysis)
      );
      setAnalyses(data);
    });

    return unsubscribe;
  }, [userId, session?.id]);

  // 监听事件
  useEffect(() => {
    if (!userId || !session?.id) return;

    const eventsRef = collection(
      db,
      `users/${userId}/sessions/${session.id}/events`
    );
    const q = query(eventsRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as SessionEvent)
      );
      setEvents(data);
    });

    return unsubscribe;
  }, [userId, session?.id]);

  return { session, analyses, events, loading };
}
