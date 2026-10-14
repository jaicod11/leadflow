import { apiFetch } from "@/lib/api/client";
import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  User,
} from "@/lib/types";

export function login(data: LoginRequest): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/auth/login", { method: "POST", body: data });
}

export function register(data: RegisterRequest): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/auth/register", {
    method: "POST",
    body: data,
  });
}

export function getMe(signal?: AbortSignal): Promise<User> {
  return apiFetch<User>("/auth/me", { signal });
}
