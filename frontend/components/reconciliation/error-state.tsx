import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Alert variant="destructive" className="my-6 shadow-xs">
      <AlertCircle className="h-5 w-5" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <AlertTitle className="text-base font-semibold">
            Unable to load disagreements
          </AlertTitle>
          <AlertDescription className="text-sm mt-1">
            {message || "Make sure the Django backend is running at http://127.0.0.1:8000."}
          </AlertDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="shrink-0 bg-white hover:bg-rose-100 text-rose-900 border-rose-300 dark:bg-zinc-950 dark:border-rose-900 dark:hover:bg-rose-950/50 dark:text-rose-200"
        >
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Retry Connection
        </Button>
      </div>
    </Alert>
  );
}
