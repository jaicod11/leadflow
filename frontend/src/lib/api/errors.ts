// Kept free of env/config imports so pure logic (and its tests) can use ApiError directly.

/** Every failure from apiFetch is an ApiError (status 0 = the request never reached the API). */
export class ApiError extends Error {
  readonly status: number;
  /** Field-level messages from a 422 response, keyed by field name, e.g. { name: "This field cannot be empty" }. */
  readonly fieldErrors: Record<string, string>;

  constructor(
    status: number,
    message: string,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

// Lets React Query type `error` as ApiError, since every queryFn/mutationFn goes through apiFetch.
declare module "@tanstack/react-query" {
  interface Register {
    defaultError: ApiError;
  }
}
