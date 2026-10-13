import { ApiError } from "@/lib/api/errors";
import { env } from "@/lib/env";

const NETWORK_ERROR_MESSAGE = "Can't reach the server. Is the API running?";

type QueryParams = Record<string, string | number | null | undefined>;

interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH";
  /** Serialized as JSON. */
  body?: unknown;
  /** Appended as a query string; null, undefined and "" values are skipped. */
  query?: QueryParams;
  signal?: AbortSignal;
}

export async function apiFetch<T>(
  path: string,
  { method = "GET", body, query, signal }: ApiFetchOptions = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined && { "Content-Type": "application/json" }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error; // cancelled by the caller (e.g. React Query); not a failure
    throw new ApiError(0, NETWORK_ERROR_MESSAGE);
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(response.status, "The server sent an invalid response.");
  }
}

function buildUrl(path: string, query: QueryParams = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "")
      params.set(key, String(value));
  }
  const queryString = params.toString();
  return `${env.apiUrl}${path}${queryString ? `?${queryString}` : ""}`;
}

async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  const detail =
    isRecord(body) && typeof body.detail === "string" ? body.detail : null;
  const message = detail ?? `Request failed with status ${response.status}.`;
  const fieldErrors = isRecord(body) ? parseFieldErrors(body.errors) : {};
  return new ApiError(response.status, message, fieldErrors);
}

/** Turns the 422 `errors: [{ field, message }]` array into `{ [field]: message }` (first message per field). */
function parseFieldErrors(errors: unknown): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  if (!Array.isArray(errors)) return fieldErrors;
  for (const error of errors) {
    if (
      isRecord(error) &&
      typeof error.field === "string" &&
      typeof error.message === "string"
    ) {
      fieldErrors[error.field] ??= error.message;
    }
  }
  return fieldErrors;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
