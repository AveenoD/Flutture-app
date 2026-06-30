"use client";

import React from "react";
import { ActionLinks } from "./ActionLinks";

type ActionVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";

type Action = {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: ActionVariant;
  description?: string;
  badge?: string | number;
  disabled?: boolean;
};

type QuickActionsProps = {
  actions: Action[];
  layout?: "grid" | "horizontal" | "vertical";
  variant?: "default" | "bar" | "compact" | "minimal";
  title?: string;
  showSelectedCount?: number;
  className?: string;
};

export function QuickActions({
  actions,
  layout = "grid",
  variant = "default",
  title,
  showSelectedCount,
  className = "",
}: QuickActionsProps) {
  const actionLinks = actions.map((action) => ({
    id: action.id,
    icon: action.icon,
    label: action.label,
    onClick: action.onClick,
    description: action.description,
    badge: action.badge,
    variant: action.variant,
    disabled: action.disabled,
  }));

  return (
    <ActionLinks
      items={actionLinks}
      layout={layout}
      variant={variant}
      title={title}
      showSelectedCount={showSelectedCount}
      className={className}
    />
  );
}


