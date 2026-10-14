import { describe, expect, it } from "vitest";

import {
  toLoginRequest,
  toRegisterRequest,
  validateLoginForm,
  validateRegisterForm,
} from "@/lib/auth/auth-form";

describe("validateLoginForm", () => {
  it("accepts an email and any non-empty password", () => {
    expect(
      validateLoginForm({ email: " demo@leadflow.app ", password: "x" }),
    ).toEqual({});
  });

  it.each([
    ["", "Enter your email address"],
    ["   ", "Enter your email address"],
    ["demo", "Enter a valid email address"],
    ["demo@leadflow", "Enter a valid email address"],
    ["de mo@leadflow.app", "Enter a valid email address"],
    ["demo@@leadflow.app", "Enter a valid email address"],
  ])("rejects the email %j", (email, message) => {
    expect(validateLoginForm({ email, password: "secret" }).email).toBe(
      message,
    );
  });

  it("requires a password, up to 128 characters", () => {
    expect(validateLoginForm({ email: "a@b.co", password: "" }).password).toBe(
      "Enter your password",
    );
    expect(
      validateLoginForm({ email: "a@b.co", password: "x".repeat(129) })
        .password,
    ).toBe("Password must be at most 128 characters");
  });
});

describe("validateRegisterForm", () => {
  const valid = {
    name: "Ana Rao",
    email: "ana@example.com",
    password: "eight-ch",
  };

  it("accepts a valid form", () => {
    expect(validateRegisterForm(valid)).toEqual({});
  });

  it("requires a trimmed name of at most 80 characters", () => {
    expect(validateRegisterForm({ ...valid, name: "   " }).name).toBe(
      "Enter your name",
    );
    expect(
      validateRegisterForm({ ...valid, name: ` ${"a".repeat(80)} ` }).name,
    ).toBeUndefined();
    expect(validateRegisterForm({ ...valid, name: "a".repeat(81) }).name).toBe(
      "Name must be at most 80 characters",
    );
  });

  it("requires a password of 8 to 128 characters, without trimming it", () => {
    expect(
      validateRegisterForm({ ...valid, password: "seven77" }).password,
    ).toBe("Password must be at least 8 characters");
    // 8 characters only because the spaces count: passwords are never trimmed.
    expect(
      validateRegisterForm({ ...valid, password: "  abcd  " }).password,
    ).toBeUndefined();
    expect(
      validateRegisterForm({ ...valid, password: "x".repeat(129) }).password,
    ).toBe("Password must be at most 128 characters");
  });

  it("counts characters like the backend (an emoji is one character)", () => {
    expect(
      validateRegisterForm({ ...valid, password: "😀".repeat(8) }).password,
    ).toBeUndefined();
  });

  it("reports every invalid field", () => {
    expect(
      validateRegisterForm({ name: "", email: "nope", password: "short" }),
    ).toEqual({
      name: "Enter your name",
      email: "Enter a valid email address",
      password: "Password must be at least 8 characters",
    });
  });
});

describe("request builders", () => {
  it("trim the email and name but never the password", () => {
    expect(toLoginRequest({ email: " a@b.co ", password: " pw " })).toEqual({
      email: "a@b.co",
      password: " pw ",
    });
    expect(
      toRegisterRequest({
        name: " Ana ",
        email: " a@b.co ",
        password: " password ",
      }),
    ).toEqual({ name: "Ana", email: "a@b.co", password: " password " });
  });
});
