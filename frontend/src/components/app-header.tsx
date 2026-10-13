import { Plus, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AppHeader() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            <TrendingUp className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight">LeadFlow</span>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            {/* A disabled button ignores pointer events, so this wrapper receives hover/focus for the tooltip. */}
            <span
              tabIndex={0}
              className="rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-blue-500/50"
            >
              <Button
                disabled
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus aria-hidden />
                Add New Lead
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
