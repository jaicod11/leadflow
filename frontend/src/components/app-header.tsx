import { Plus, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AppHeader() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <TrendingUp className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight">LeadFlow</span>
        </div>
        {/* Wired up in a later task (Add New Lead modal). */}
        <Button disabled>
          <Plus aria-hidden />
          Add New Lead
        </Button>
      </div>
    </header>
  );
}
