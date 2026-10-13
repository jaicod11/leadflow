import { format } from "date-fns";
import { CircleAlert, LoaderCircle } from "lucide-react";
import {
  useId,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { toast } from "sonner";

import { FollowUpFields } from "@/components/leads/timeline/follow-up-fields";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateDiscussion } from "@/hooks/use-discussions";
import { formatFollowUp } from "@/lib/dates";
import {
  getDefaultFollowUp,
  toFollowUpIso,
  validateFollowUp,
  type FollowUpInput,
} from "@/lib/follow-up-form";

const NOTE_MAX_LENGTH = 5000;
const NOTE_COUNTER_THRESHOLD = 4500;

interface FormErrors {
  note?: string;
  followUp?: string;
  /** An API error that doesn't belong to a specific field. */
  form?: string;
}

interface AddDiscussionFormProps {
  leadId: number;
  now: Date;
  noteInputRef: RefObject<HTMLTextAreaElement | null>;
}

/** The dialog's sticky footer: log a discussion, optionally setting the lead's next follow-up. */
export function AddDiscussionForm({
  leadId,
  now,
  noteInputRef,
}: AddDiscussionFormProps) {
  const createDiscussion = useCreateDiscussion(leadId);
  const [note, setNote] = useState("");
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUp, setFollowUp] = useState<FollowUpInput>({
    date: "",
    time: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const noteErrorId = useId();
  const followUpErrorId = useId();

  const isSaving = createDiscussion.isPending;
  const canSave = note.trim() !== "" && !isSaving;

  function handleFollowUpEnabledChange(enabled: boolean) {
    setFollowUpEnabled(enabled);
    if (enabled) setFollowUp(getDefaultFollowUp(new Date()));
    setErrors((prev) => ({ ...prev, followUp: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    let followUpAt: string | undefined;
    if (followUpEnabled) {
      const followUpError = validateFollowUp(
        followUp.date,
        followUp.time,
        new Date(),
      );
      if (followUpError) {
        setErrors({ followUp: followUpError });
        return;
      }
      followUpAt = toFollowUpIso(followUp.date, followUp.time) ?? undefined;
    }

    setErrors({});
    createDiscussion.mutate(
      { note: note.trim(), follow_up_at: followUpAt },
      {
        onSuccess: (discussion) => {
          setNote("");
          setFollowUpEnabled(false);
          toast.success(
            discussion.follow_up_at
              ? `Discussion logged · follow-up set for ${formatFollowUp(discussion.follow_up_at, new Date(), { midSentence: true })}`
              : "Discussion logged",
          );
          noteInputRef.current?.focus();
        },
        onError: (error) => {
          // Keep the typed note; show field errors inline, anything else above the button.
          const { note: noteError, follow_up_at: followUpError } =
            error.fieldErrors;
          setErrors(
            noteError || followUpError
              ? { note: noteError, followUp: followUpError }
              : { form: error.message },
          );
          noteInputRef.current?.focus();
        },
      },
    );
  }

  function handleNoteKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-3 border-t bg-white px-5 py-4"
    >
      <div>
        <Textarea
          ref={noteInputRef}
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            setErrors((prev) => ({
              ...prev,
              note: undefined,
              form: undefined,
            }));
          }}
          onKeyDown={handleNoteKeyDown}
          readOnly={isSaving}
          placeholder="Log a new discussion…"
          aria-label="New discussion note"
          rows={3}
          maxLength={NOTE_MAX_LENGTH}
          aria-invalid={errors.note ? true : undefined}
          aria-describedby={errors.note ? noteErrorId : undefined}
          className="max-h-48 min-h-[4.75rem] resize-none bg-white"
        />
        <div className="mt-1 flex justify-between gap-3 text-xs">
          {errors.note ? (
            <p id={noteErrorId} className="text-red-600">
              {errors.note}
            </p>
          ) : (
            <span />
          )}
          {note.length > NOTE_COUNTER_THRESHOLD && (
            <span
              className={
                note.length >= NOTE_MAX_LENGTH
                  ? "text-red-600"
                  : "text-muted-foreground"
              }
            >
              {note.length.toLocaleString()} /{" "}
              {NOTE_MAX_LENGTH.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {errors.form && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {errors.form}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <FollowUpFields
          enabled={followUpEnabled}
          onEnabledChange={handleFollowUpEnabledChange}
          value={followUp}
          onChange={(value) => {
            setFollowUp(value);
            setErrors((prev) => ({ ...prev, followUp: undefined }));
          }}
          minDate={format(now, "yyyy-MM-dd")}
          errorId={errors.followUp ? followUpErrorId : undefined}
        />
        {/* Directly under the date/time inputs on mobile; below the whole row from sm up. */}
        {errors.followUp && (
          <p
            id={followUpErrorId}
            className="-mt-1 basis-full text-xs text-red-600 sm:order-last"
          >
            {errors.followUp}
          </p>
        )}
        <Button
          type="submit"
          disabled={!canSave}
          className="w-full sm:ml-auto sm:w-auto"
        >
          {isSaving && <LoaderCircle className="animate-spin" aria-hidden />}
          Save Note
        </Button>
      </div>
    </form>
  );
}
