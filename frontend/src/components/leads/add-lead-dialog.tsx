"use client";

import { CircleAlert, LoaderCircle } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateLead } from "@/hooks/use-lead-mutations";
import {
  EMPTY_LEAD_FORM,
  LEAD_FORM_FIELDS,
  toLeadCreate,
  validateLeadForm,
  type LeadFormErrors,
  type LeadFormField,
  type LeadFormValues,
} from "@/lib/lead-form";
import type { Lead } from "@/lib/types";

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the created lead after the lead lists have refreshed. */
  onCreated: (lead: Lead) => void;
}

/**
 * "Add New Lead" modal. The form lives inside the dialog content, which unmounts on close,
 * so every open starts empty. Radix focuses the first field (Full Name) when it opens.
 */
export function AddLeadDialog({
  open,
  onOpenChange,
  onCreated,
}: AddLeadDialogProps) {
  const createLead = useCreateLead();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Don't let Esc / overlay / × drop a request that is still in flight.
        if (!next && createLead.isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="gap-5 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Add New Lead
          </DialogTitle>
          <DialogDescription className="sr-only">
            Name is required. Company and phone are optional. New leads start
            with the status New.
          </DialogDescription>
        </DialogHeader>
        <AddLeadForm
          createLead={createLead}
          onCancel={() => onOpenChange(false)}
          onCreated={onCreated}
        />
      </DialogContent>
    </Dialog>
  );
}

interface AddLeadFormProps {
  createLead: ReturnType<typeof useCreateLead>;
  onCancel: () => void;
  onCreated: (lead: Lead) => void;
}

function AddLeadForm({ createLead, onCancel, onCreated }: AddLeadFormProps) {
  const [values, setValues] = useState<LeadFormValues>(EMPTY_LEAD_FORM);
  const [errors, setErrors] = useState<LeadFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const inputs = useRef<
    Partial<Record<LeadFormField, HTMLInputElement | null>>
  >({});
  // Field to focus once a failed save finishes (the inputs are disabled while saving).
  const fieldToFocusAfterSave = useRef<LeadFormField | null>(null);
  const isSaving = createLead.isPending;

  useEffect(() => {
    const field = fieldToFocusAfterSave.current;
    if (isSaving || field === null) return;
    fieldToFocusAfterSave.current = null;
    inputs.current[field]?.focus();
  }, [isSaving]);

  function firstInvalidField(fieldErrors: LeadFormErrors) {
    return LEAD_FORM_FIELDS.find((field) => fieldErrors[field]) ?? null;
  }

  function updateField(field: LeadFormField, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setFormError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    const validationErrors = validateLeadForm(values);
    const invalidField = firstInvalidField(validationErrors);
    if (invalidField) {
      setErrors(validationErrors);
      setFormError(null);
      inputs.current[invalidField]?.focus();
      return;
    }

    setErrors({});
    setFormError(null);
    createLead.mutate(toLeadCreate(values), {
      onSuccess: onCreated,
      onError: (error) => {
        // Typed values are kept. Field errors go under their inputs; anything else above the footer.
        const fieldErrors: LeadFormErrors = Object.fromEntries(
          LEAD_FORM_FIELDS.filter((field) => error.fieldErrors[field]).map(
            (field) => [field, error.fieldErrors[field]],
          ),
        );
        fieldToFocusAfterSave.current = firstInvalidField(fieldErrors);
        setErrors(fieldErrors);
        setFormError(
          fieldToFocusAfterSave.current === null ? error.message : null,
        );
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormField
        ref={(element) => {
          inputs.current.name = element;
        }}
        label="Full Name"
        required
        placeholder="e.g. Ananya Sharma"
        autoComplete="off"
        value={values.name}
        onChange={(event) => updateField("name", event.target.value)}
        error={errors.name}
        disabled={isSaving}
      />
      <FormField
        ref={(element) => {
          inputs.current.company = element;
        }}
        label="Company"
        placeholder="e.g. Northwind Advisory"
        autoComplete="off"
        value={values.company}
        onChange={(event) => updateField("company", event.target.value)}
        error={errors.company}
        disabled={isSaving}
      />
      <FormField
        ref={(element) => {
          inputs.current.phone = element;
        }}
        label="Phone"
        type="tel"
        inputMode="tel"
        placeholder="e.g. +91 98765 43210"
        autoComplete="off"
        value={values.phone}
        onChange={(event) => updateField("phone", event.target.value)}
        error={errors.phone}
        disabled={isSaving}
      />

      {formError && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {formError}
        </p>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button type="submit" variant="brand" disabled={isSaving}>
          {isSaving && <LoaderCircle className="animate-spin" aria-hidden />}
          Save Lead
        </Button>
      </DialogFooter>
    </form>
  );
}

interface FormFieldProps extends ComponentProps<typeof Input> {
  label: string;
  /** Required fields get a red asterisk; the others a muted "(Optional)". */
  required?: boolean;
  error?: string;
}

function FormField({
  label,
  required = false,
  error,
  ...inputProps
}: FormFieldProps) {
  const inputId = useId();
  const errorId = useId();

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>
        {label}
        {required ? (
          <span className="text-red-600" aria-hidden>
            *
          </span>
        ) : (
          <span className="font-normal text-muted-foreground">(Optional)</span>
        )}
      </Label>
      <Input
        id={inputId}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-9 bg-white"
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
