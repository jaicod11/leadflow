"use client";

import { useMutation } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { AuthField } from "@/components/auth/auth-field";
import { useAuth } from "@/components/auth/auth-provider";
import { FormAlert } from "@/components/auth/form-alert";
import { ServerWakingNotice } from "@/components/auth/server-waking-notice";
import { Button } from "@/components/ui/button";
import { useDelayedFlag } from "@/hooks/use-delayed-flag";
import {
  LOGIN_FORM_FIELDS,
  toLoginRequest,
  validateLoginForm,
  type LoginFormErrors,
  type LoginFormValues,
} from "@/lib/auth/auth-form";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo-account";

type LoginField = keyof LoginFormValues;

const SLOW_SIGN_IN_MS = 4000;

function firstInvalidField(errors: LoginFormErrors): LoginField | null {
  return LOGIN_FORM_FIELDS.find((field) => errors[field]) ?? null;
}

/** Email + password sign-in, plus the demo account shortcut. The page redirects once signed in. */
export function LoginForm() {
  const { login, status } = useAuth();
  const signIn = useMutation({ mutationFn: login });
  const [values, setValues] = useState<LoginFormValues>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const inputs = useRef<Partial<Record<LoginField, HTMLInputElement | null>>>(
    {},
  );
  // Field to focus once a failed request finishes (the inputs are disabled while it runs).
  const fieldToFocusAfterSubmit = useRef<LoginField | null>(null);
  // Stays busy after success too, while the page redirects.
  const isBusy = signIn.isPending || status === "authenticated";
  const isSlow = useDelayedFlag(signIn.isPending, SLOW_SIGN_IN_MS);

  useEffect(() => {
    const field = fieldToFocusAfterSubmit.current;
    if (signIn.isPending || field === null) return;
    fieldToFocusAfterSubmit.current = null;
    inputs.current[field]?.focus();
  }, [signIn.isPending]);

  function updateField(field: LoginField, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setFormError(null);
  }

  function submit(credentials: LoginFormValues) {
    const validationErrors = validateLoginForm(credentials);
    const invalidField = firstInvalidField(validationErrors);
    setErrors(validationErrors);
    setFormError(null);
    if (invalidField) {
      inputs.current[invalidField]?.focus();
      return;
    }

    signIn.mutate(toLoginRequest(credentials), {
      onError: (error) => {
        if (error.status === 401) {
          // Wrong credentials: keep the typed email, clear only the password.
          setValues((previous) => ({ ...previous, password: "" }));
          setFormError(error.message);
          fieldToFocusAfterSubmit.current = "password";
          return;
        }
        const fieldErrors: LoginFormErrors = {
          email: error.fieldErrors.email,
          password: error.fieldErrors.password,
        };
        fieldToFocusAfterSubmit.current = firstInvalidField(fieldErrors);
        setErrors(fieldErrors);
        setFormError(
          fieldToFocusAfterSubmit.current === null ? error.message : null,
        );
      },
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isBusy) submit(values);
  }

  function signInWithDemoAccount() {
    const demo = { email: DEMO_EMAIL, password: DEMO_PASSWORD };
    setValues(demo);
    submit(demo);
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthField
          ref={(element) => {
            inputs.current.email = element;
          }}
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={values.email}
          onChange={(event) => updateField("email", event.target.value)}
          error={errors.email}
          disabled={isBusy}
        />
        <AuthField
          ref={(element) => {
            inputs.current.password = element;
          }}
          label="Password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(event) => updateField("password", event.target.value)}
          error={errors.password}
          disabled={isBusy}
        />

        {formError && <FormAlert message={formError} />}

        <Button
          type="submit"
          variant="brand"
          size="lg"
          className="w-full"
          disabled={isBusy}
        >
          {isBusy && <LoaderCircle className="animate-spin" aria-hidden />}
          Sign in
        </Button>
        {isSlow && <ServerWakingNotice />}
      </form>

      <div className="mt-6 rounded-lg border border-dashed bg-muted/50 p-4">
        <p className="text-sm font-medium">Demo account</p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="truncate font-mono text-[0.8125rem]">{DEMO_EMAIL}</dd>
          <dt className="text-muted-foreground">Password</dt>
          <dd className="font-mono text-[0.8125rem]">{DEMO_PASSWORD}</dd>
        </dl>
        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full bg-white"
          onClick={signInWithDemoAccount}
          disabled={isBusy}
        >
          Use demo account
        </Button>
      </div>
    </>
  );
}
