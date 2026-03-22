"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInAnonymously,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthState {
  status: "loading" | "authenticated" | "unauthenticated";
  user: User | null;
  userId: string | null;
  error: string | null;
}

const AuthContext = createContext<AuthState>({
  status: "loading",
  user: null,
  userId: null,
  error: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
    userId: null,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setState({
          status: "authenticated",
          user,
          userId: user.uid,
          error: null,
        });
      } else {
        // 未登录 → 自动匿名登录
        try {
          const result = await signInAnonymously(auth);
          setState({
            status: "authenticated",
            user: result.user,
            userId: result.user.uid,
            error: null,
          });
        } catch (err) {
          setState({
            status: "unauthenticated",
            user: null,
            userId: null,
            error: err instanceof Error ? err.message : "认证失败",
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={state}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
