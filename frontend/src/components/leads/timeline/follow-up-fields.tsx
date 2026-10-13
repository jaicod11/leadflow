import { useId } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FollowUpInput } from "@/lib/follow-up-form";

interface FollowUpFieldsProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  value: FollowUpInput;
  onChange: (value: FollowUpInput) => void;
  /** Earliest selectable date ("yyyy-MM-dd"): today. */
  minDate: string;
  /** id of the element describing a validation error, if any. */
  errorId?: string;
}

/** "Set follow-up" checkbox + native date and time inputs (disabled until checked). */
export function FollowUpFields({
  enabled,
  onEnabledChange,
  value,
  onChange,
  minDate,
  errorId,
}: FollowUpFieldsProps) {
  const checkboxId = useId();
  const invalid = errorId !== undefined;

  return (
    <>
      <div className="flex items-center gap-2">
        <Checkbox
          id={checkboxId}
          checked={enabled}
          onCheckedChange={(checked) => onEnabledChange(checked === true)}
        />
        <Label htmlFor={checkboxId} className="font-normal">
          Set follow-up
        </Label>
      </div>
      <div className="flex gap-2">
        <Input
          type="date"
          aria-label="Follow-up date"
          value={value.date}
          min={minDate}
          onChange={(event) => onChange({ ...value, date: event.target.value })}
          disabled={!enabled}
          aria-invalid={invalid || undefined}
          aria-describedby={errorId}
          className="w-38 bg-white"
        />
        <Input
          type="time"
          aria-label="Follow-up time"
          value={value.time}
          onChange={(event) => onChange({ ...value, time: event.target.value })}
          disabled={!enabled}
          aria-invalid={invalid || undefined}
          aria-describedby={errorId}
          className="w-32 bg-white"
        />
      </div>
    </>
  );
}
