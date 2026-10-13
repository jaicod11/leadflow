import { ApiStatusPanel } from "@/components/api-status-panel";
import { AppHeader } from "@/components/app-header";

export default function HomePage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <ApiStatusPanel />
      </main>
    </>
  );
}
