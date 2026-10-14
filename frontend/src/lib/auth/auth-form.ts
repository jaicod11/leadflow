// Client-side mirror of the backend LoginRequest / RegisterRequest rules (backend/app/schemas/auth.py).
// The server stays the source of truth: anything that slips through comes back as a 422 field error.

import type { LoginRequest, RegisterRequest } from "@/lib/types";

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
}

export type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;
export type RegisterFormErrors = Partial<
  Record<keyof RegisterFormValues, string>
>;

/** Field order in each form, e.g. for focusing the first invalid field. */
export const LOGIN_FORM_FIELDS: readonly (keyof LoginFormValues)[] = [
  "email",
  "password",
];
export const REGISTER_FORM_FIELDS: readonly (keyof RegisterFormValues)[] = [
  "name",
  "email",
  "password",
];

const NAME_MAX_LENGTH = 80;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
// A pragmatic shape check (one @, no spaces, a dot in the domain); the API does full validation.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Length in Unicode code points, like Python's len() on the backend. */
function codePointLength(value: string): number {
  return Array.from(value).length;
}

function emailError(email: string): string | undefined {
  const value = email.trim();
  if (value === "") return "Enter your email address";
  if (!EMAIL_PATTERN.test(value)) return "Enter a valid email address";
  return undefined;
}

export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};
  const email = emailError(values.email);
  if (email) errors.email = email;
  if (values.password === "") errors.password = "Enter your password";
  else if (codePointLength(values.password) > PASSWORD_MAX_LENGTH)
    errors.password = `Password must be at most ${PASSWORD_MAX_LENGTH} characters`;
  return errors;
}

export function validateRegisterForm(
  values: RegisterFormValues,
): RegisterFormErrors {
  const errors: RegisterFormErrors = {};
  const name = values.name.trim();
  if (name === "") errors.name = "Enter your name";
  else if (codePointLength(name) > NAME_MAX_LENGTH)
    errors.name = `Name must be at most ${NAME_MAX_LENGTH} characters`;

  const email = emailError(values.email);
  if (email) errors.email = email;

  // Passwords are never trimmed (same as the API).
  const passwordLength = codePointLength(values.password);
  if (passwordLength < PASSWORD_MIN_LENGTH)
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  else if (passwordLength > PASSWORD_MAX_LENGTH)
    errors.password = `Password must be at most ${PASSWORD_MAX_LENGTH} characters`;
  return errors;
}

export function toLoginRequest(values: LoginFormValues): LoginRequest {
  return { email: values.email.trim(), password: values.password };
}

export function toRegisterRequest(values: RegisterFormValues): RegisterRequest {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    password: values.password,
  };
}
