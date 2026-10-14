import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import {
  AuthSwitchLink,
  RedirectIfAuthenticated,
  SessionExpiredNotice,
} from "@/components/auth/auth-navigation";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in · LeadFlow" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in to LeadFlow"
      description="Welcome back. Sign in to see your leads and follow-ups."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <AuthSwitchLink href="/register">Create one</AuthSwitchLink>
        </>
      }
    >
      <RedirectIfAuthenticated />
      <SessionExpiredNotice />
      <LoginForm />
    </AuthCard>
  );
}
