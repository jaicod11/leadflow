import { skipToken, useQuery } from "@tanstack/react-query";

import { getMe } from "@/lib/api/auth";
import { queryKeys } from "@/lib/query-keys";

/** The signed-in user. Disabled (no request) while there is no token. */
export function useMe(token: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: token ? ({ signal }) => getMe(signal) : skipToken,
  });
}
