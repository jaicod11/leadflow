import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import {
  AuthSwitchLink,
  RedirectIfAuthenticated,
} from "@/components/auth/auth-navigation";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Create account · LeadFlow" };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Start tracking leads and follow-ups in minutes."
      footer={
        <>
          Already have an account?{" "}
          <AuthSwitchLink href="/login">Sign in</AuthSwitchLink>
        </>
      }
    >
      <RedirectIfAuthenticated />
      <RegisterForm />
    </AuthCard>
  );
}
