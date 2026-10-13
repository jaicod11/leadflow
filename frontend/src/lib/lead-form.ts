// Client-side mirror of the backend LeadCreate rules (backend/app/schemas/lead.py), with the
// same messages the API returns, so the form can reject bad input before sending it.

import type { LeadCreate } from "@/lib/types";

export interface LeadFormValues {
  name: string;
  company: string;
  phone: string;
}

export type LeadFormField = keyof LeadFormValues;
export type LeadFormErrors = Partial<Record<LeadFormField, string>>;

/** Field order in the form, e.g. for focusing the first invalid field. */
export const LEAD_FORM_FIELDS: readonly LeadFormField[] = [
  "name",
  "company",
  "phone",
];

export const EMPTY_LEAD_FORM: LeadFormValues = {
  name: "",
  company: "",
  phone: "",
};

const NAME_MAX_LENGTH = 120;
const COMPANY_MAX_LENGTH = 120;
const PHONE_MAX_LENGTH = 32;
const PHONE_PATTERN = /^[0-9 +\-().]*$/;

export const LEAD_FORM_MESSAGES = {
  // What the API says for a blank name ("This field is required" only means a missing key).
  empty: "This field cannot be empty",
  tooLong: (max: number) => `String should have at most ${max} characters`,
  phoneCharacters:
    "Phone may only contain digits, spaces, and + - ( ) . characters",
} as const;

/** Length in Unicode code points, like Python's len() on the backend (an emoji counts as 1). */
function codePointLength(value: string): number {
  return Array.from(value).length;
}

/** Errors keyed by field; an empty object means the form is valid. Values are checked after trimming. */
export function validateLeadForm(values: LeadFormValues): LeadFormErrors {
  const errors: LeadFormErrors = {};
  const name = values.name.trim();
  const company = values.company.trim();
  const phone = values.phone.trim();

  if (name === "") errors.name = LEAD_FORM_MESSAGES.empty;
  else if (codePointLength(name) > NAME_MAX_LENGTH)
    errors.name = LEAD_FORM_MESSAGES.tooLong(NAME_MAX_LENGTH);

  if (codePointLength(company) > COMPANY_MAX_LENGTH)
    errors.company = LEAD_FORM_MESSAGES.tooLong(COMPANY_MAX_LENGTH);

  // Like the backend: the length check runs before the character check.
  if (codePointLength(phone) > PHONE_MAX_LENGTH)
    errors.phone = LEAD_FORM_MESSAGES.tooLong(PHONE_MAX_LENGTH);
  else if (!PHONE_PATTERN.test(phone))
    errors.phone = LEAD_FORM_MESSAGES.phoneCharacters;

  return errors;
}

/** The API payload: everything trimmed; empty optional fields are left out (undefined). */
export function toLeadCreate(values: LeadFormValues): LeadCreate {
  return {
    name: values.name.trim(),
    company: values.company.trim() || undefined,
    phone: values.phone.trim() || undefined,
  };
}
