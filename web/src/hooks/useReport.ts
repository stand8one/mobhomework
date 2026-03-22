"use client";

import { useEffect, useState } from "react";
import { doc, collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ReportData {
  session: any;
  questions: any[];
  analyses: any[];
  loading: boolean;
}

/**
 * 获取作业报告数据
 * 包括 session 详情、题目列表、分析记录
 */
export function useReport(userId: string | null, sessionId: string): ReportData {
  const [session, setSession] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !sessionId) {
      setLoading(false);
      return;
    }

    const basePath = `users/${userId}/sessions/${sessionId}`;

    // 监听 session
    const unsubSession = onSnapshot(doc(db, basePath), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSession({
          id: snap.id,
          ...data,
          date: data.createdAt?.toDate?.()?.toLocaleDateString("zh-CN", {
            year: "numeric", month: "long", day: "numeric",
          }) || "今天",
        });
      }
      setLoading(false);
    });

    // 监听题目
    const unsubQuestions = onSnapshot(
      query(collection(db, `${basePath}/questions`), orderBy("questionIndex", "asc")),
      (snap) => {
        setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    // 监听分析
    const unsubAnalyses = onSnapshot(
      query(collection(db, `${basePath}/analyses`), orderBy("analyzedAt", "asc")),
      (snap) => {
        setAnalyses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    return () => {
      unsubSession();
      unsubQuestions();
      unsubAnalyses();
    };
  }, [userId, sessionId]);

  return { session, questions, analyses, loading };
}
