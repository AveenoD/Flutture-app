import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState = ({
  title = "Something went wrong",
  message = "We encountered an error while loading this content. Please try again.",
  onRetry,
  className = "",
}: ErrorStateProps) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="mb-4 p-4 rounded-full bg-[var(--surface-error)]">
        <AlertCircle size={48} className="text-[var(--error)]" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-dark)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary-base)] text-white rounded-md text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2"
          aria-label="Retry"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      )}
    </div>
  );
};

