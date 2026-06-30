import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      {Icon && (
        <div className="mb-4 p-4 rounded-full bg-[var(--surface-neutral)]">
          <Icon size={48} className="text-[var(--text-secondary)]" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--text-dark)] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 bg-[var(--primary-base)] text-white rounded-md text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2"
          aria-label={actionLabel}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

