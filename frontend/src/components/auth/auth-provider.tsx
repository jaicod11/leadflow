"use client";

import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { useMe } from "@/hooks/use-me";
import * as authApi from "@/lib/api/auth";
import { setUnauthorizedHandler } from "@/lib/api/client";
import type { SignOutReason } from "@/lib/auth/login-url";
import {
  clearToken,
  getToken,
  setToken,
  subscribeToToken,
} from "@/lib/auth/token-storage";
import { queryKeys } from "@/lib/query-keys";
import type { LoginRequest, RegisterRequest, User } from "@/lib/types";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  /** The signed-in user; null while loading, when signed out, or if /auth/me failed (e.g. network). */
  user: User | null;
  status: AuthStatus;
  /** Why the last session ended in this tab, so the login redirect can explain it. */
  signOutReason: SignOutReason | null;
  login: (credentials: LoginRequest) => Promise<User>;
  register: (data: RegisterRequest) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// No token during server rendering and hydration: the status stays "loading" until the browser reads it.
const getServerToken = () => undefined;

/** Ends the session locally: no token, and no cached lead data left in memory. */
function endSession(queryClient: QueryClient): void {
  clearToken();
  queryClient.clear();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const token = useSyncExternalStore(
    subscribeToToken,
    getToken,
    getServerToken,
  );
  const me = useMe(token);
  const [signOutReason, setSignOutReason] = useState<SignOutReason | null>(
    null,
  );

  // A 401 on an authenticated request means the token expired or is invalid. Several requests
  // can fail at once; only the first one (while a token is still stored) ends the session.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (getToken() === null) return;
      setSignOutReason("expired");
      endSession(queryClient);
    });
    return () => setUnauthorizedHandler(null);
  }, [queryClient]);

  // The token can also disappear without this tab's logout (another tab signed out, or the page came
  // back from the browser's back/forward cache): drop any cached data then too.
  useEffect(() => {
    if (token === null) queryClient.clear();
  }, [token, queryClient]);

  const startSession = useCallback(
    (response: { access_token: string; user: User }) => {
      // Cache the user first, so the status flips straight to "authenticated" without a /me request.
      queryClient.setQueryData(queryKeys.auth.me, response.user);
      setSignOutReason(null);
      setToken(response.access_token);
      return response.user;
    },
    [queryClient],
  );

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const user = startSession(await authApi.login(credentials));
      toast.success(`Welcome back, ${user.name}`);
      return user;
    },
    [startSession],
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      const user = startSession(await authApi.register(data));
      toast.success(`Account created — welcome, ${user.name}`);
      return user;
    },
    [startSession],
  );

  // The redirect to /login happens in RequireAuth, which reacts to the status change.
  const logout = useCallback(() => {
    setSignOutReason("logout");
    endSession(queryClient);
    toast.success("Signed out");
  }, [queryClient]);

  let status: AuthStatus;
  if (token === undefined) status = "loading";
  else if (token === null) status = "unauthenticated";
  else if (me.data) status = "authenticated";
  // /me failed for another reason (network, server error): the token may still be valid,
  // so let the screen load and show its own error states instead of signing the user out.
  else if (me.isError && me.error.status !== 401) status = "authenticated";
  else status = "loading";

  const user = token ? (me.data ?? null) : null;
  const value = useMemo<AuthContextValue>(
    () => ({ user, status, signOutReason, login, register, logout }),
    [user, status, signOutReason, login, register, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
