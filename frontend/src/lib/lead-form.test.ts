import { describe, expect, it } from "vitest";

import {
  EMPTY_LEAD_FORM,
  toLeadCreate,
  validateLeadForm,
  type LeadFormValues,
} from "@/lib/lead-form";

const form = (values: Partial<LeadFormValues>): LeadFormValues => ({
  ...EMPTY_LEAD_FORM,
  ...values,
});

describe("validateLeadForm", () => {
  it("accepts a name only", () => {
    expect(validateLeadForm(form({ name: "Ananya Sharma" }))).toEqual({});
  });

  it("accepts all fields", () => {
    expect(
      validateLeadForm(
        form({
          name: "Ananya Sharma",
          company: "Northwind Advisory",
          phone: "+91 (98765) 43-210.1",
        }),
      ),
    ).toEqual({});
  });

  it.each(["", "   ", "\n\t "])("requires a non-blank name (%j)", (name) => {
    expect(validateLeadForm(form({ name }))).toEqual({
      name: "This field cannot be empty",
    });
  });

  it("limits the name to 120 characters after trimming", () => {
    expect(validateLeadForm(form({ name: `  ${"a".repeat(120)}  ` }))).toEqual(
      {},
    );
    expect(validateLeadForm(form({ name: "a".repeat(121) }))).toEqual({
      name: "String should have at most 120 characters",
    });
  });

  it("counts characters like the backend (an emoji is one character)", () => {
    // 120 emoji: 240 UTF-16 code units in JS, but 120 characters in Python.
    expect(validateLeadForm(form({ name: "😀".repeat(120) }))).toEqual({});
    expect(validateLeadForm(form({ name: "😀".repeat(121) }))).toEqual({
      name: "String should have at most 120 characters",
    });
  });

  it("limits the company to 120 characters", () => {
    expect(
      validateLeadForm(form({ name: "A", company: "c".repeat(120) })),
    ).toEqual({});
    expect(
      validateLeadForm(form({ name: "A", company: "c".repeat(121) })),
    ).toEqual({ company: "String should have at most 120 characters" });
  });

  it.each(["abc", "98765x", "+91 98765#43210", "98765\t43210", "١٢٣"])(
    "rejects phone %j",
    (phone) => {
      expect(validateLeadForm(form({ name: "A", phone }))).toEqual({
        phone:
          "Phone may only contain digits, spaces, and + - ( ) . characters",
      });
    },
  );

  it("limits the phone to 32 characters, checked before the allowed characters", () => {
    expect(
      validateLeadForm(form({ name: "A", phone: "1".repeat(32) })),
    ).toEqual({});
    expect(
      validateLeadForm(form({ name: "A", phone: "1".repeat(33) })),
    ).toEqual({
      phone: "String should have at most 32 characters",
    });
    expect(
      validateLeadForm(form({ name: "A", phone: "x".repeat(33) })),
    ).toEqual({
      phone: "String should have at most 32 characters",
    });
  });

  it("reports every invalid field at once", () => {
    expect(
      validateLeadForm(
        form({ name: " ", company: "c".repeat(121), phone: "abc" }),
      ),
    ).toEqual({
      name: "This field cannot be empty",
      company: "String should have at most 120 characters",
      phone: "Phone may only contain digits, spaces, and + - ( ) . characters",
    });
  });
});

describe("toLeadCreate", () => {
  it("trims every field", () => {
    expect(
      toLeadCreate(
        form({
          name: "  Ananya Sharma ",
          company: " Northwind Advisory ",
          phone: " +91 98765 43210 ",
        }),
      ),
    ).toEqual({
      name: "Ananya Sharma",
      company: "Northwind Advisory",
      phone: "+91 98765 43210",
    });
  });

  it("leaves empty optional fields out of the request body", () => {
    const payload = toLeadCreate(
      form({ name: "Ananya", company: "   ", phone: "" }),
    );
    expect(payload).toEqual({
      name: "Ananya",
      company: undefined,
      phone: undefined,
    });
    expect(JSON.stringify(payload)).toBe('{"name":"Ananya"}');
  });
});
