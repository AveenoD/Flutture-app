"use client";

import React from "react";
import { ActionLinks } from "./ActionLinks";

type QuickLink = {
  id: string;
  icon: React.ReactNode;
  label: string;
  href: string;
  description?: string;
  badge?: string | number;
  color?: string;
};

type QuickLinksProps = {
  links: QuickLink[];
  layout?: "grid" | "list";
  title?: string;
  className?: string;
};

export function QuickLinks({
  links,
  layout = "grid",
  title,
  className = "",
}: QuickLinksProps) {
  const actionLinks = links.map((link) => ({
    id: link.id,
    icon: link.icon,
    label: link.label,
    href: link.href,
    description: link.description,
    badge: link.badge,
    color: link.color,
  }));

  return (
    <ActionLinks
      items={actionLinks}
      layout={layout === "list" ? "list" : "grid"}
      title={title}
      className={className}
    />
  );
}

