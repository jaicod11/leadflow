import { RequireAuth } from "@/components/auth/require-auth";
import { LeadsScreen } from "@/components/leads-screen";

export default function HomePage() {
  return (
    <RequireAuth>
      <LeadsScreen />
    </RequireAuth>
  );
}
