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
  REGISTER_FORM_FIELDS,
  toRegisterRequest,
  validateRegisterForm,
  type RegisterFormErrors,
  type RegisterFormValues,
} from "@/lib/auth/auth-form";

type RegisterField = keyof RegisterFormValues;

const SLOW_SIGN_UP_MS = 4000;

function firstInvalidField(errors: RegisterFormErrors): RegisterField | null {
  return REGISTER_FORM_FIELDS.find((field) => errors[field]) ?? null;
}

/** Name + email + password sign-up. The new account is signed in; the page then redirects. */
export function RegisterForm() {
  const { register, status } = useAuth();
  const signUp = useMutation({ mutationFn: register });
  const [values, setValues] = useState<RegisterFormValues>({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const inputs = useRef<
    Partial<Record<RegisterField, HTMLInputElement | null>>
  >({});
  // Field to focus once a failed request finishes (the inputs are disabled while it runs).
  const fieldToFocusAfterSubmit = useRef<RegisterField | null>(null);
  // Stays busy after success too, while the page redirects.
  const isBusy = signUp.isPending || status === "authenticated";
  const isSlow = useDelayedFlag(signUp.isPending, SLOW_SIGN_UP_MS);

  useEffect(() => {
    const field = fieldToFocusAfterSubmit.current;
    if (signUp.isPending || field === null) return;
    fieldToFocusAfterSubmit.current = null;
    inputs.current[field]?.focus();
  }, [signUp.isPending]);

  function updateField(field: RegisterField, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setFormError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isBusy) return;

    const validationErrors = validateRegisterForm(values);
    const invalidField = firstInvalidField(validationErrors);
    setErrors(validationErrors);
    setFormError(null);
    if (invalidField) {
      inputs.current[invalidField]?.focus();
      return;
    }

    signUp.mutate(toRegisterRequest(values), {
      onError: (error) => {
        // 409: the email is taken, which belongs under the Email field. 422: per-field messages.
        const fieldErrors: RegisterFormErrors =
          error.status === 409
            ? { email: error.message }
            : {
                name: error.fieldErrors.name,
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

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AuthField
        ref={(element) => {
          inputs.current.name = element;
        }}
        label="Name"
        autoComplete="name"
        placeholder="e.g. Ananya Sharma"
        value={values.name}
        onChange={(event) => updateField("name", event.target.value)}
        error={errors.name}
        disabled={isBusy}
      />
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
        autoComplete="new-password"
        hint="At least 8 characters"
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
        Create account
      </Button>
      {isSlow && <ServerWakingNotice />}
    </form>
  );
}
