"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AuthFieldProps extends ComponentProps<typeof Input> {
  label: string;
  error?: string;
  /** Muted help text under the input; the error replaces it while there is one. */
  hint?: string;
}

/** A labelled input with its inline error. type="password" adds a show/hide toggle. */
export function AuthField({
  label,
  error,
  hint,
  type,
  disabled,
  ...inputProps
}: AuthFieldProps) {
  const inputId = useId();
  const messageId = useId();
  const [isPasswordShown, setPasswordShown] = useState(false);
  const isPassword = type === "password";
  const message = error ?? hint;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative">
        <Input
          id={inputId}
          type={isPassword && isPasswordShown ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          disabled={disabled}
          className={cn("h-9 bg-white", isPassword && "pr-10")}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setPasswordShown((shown) => !shown)}
            disabled={disabled}
            aria-label={isPasswordShown ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
          >
            {isPasswordShown ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        )}
      </div>
      {message && (
        <p
          id={messageId}
          className={cn(
            "text-xs",
            error ? "text-red-600" : "text-muted-foreground",
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
