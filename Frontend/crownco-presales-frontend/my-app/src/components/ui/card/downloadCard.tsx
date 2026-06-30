"use client";

import { Download } from "phosphor-react";

export interface DownloadCardProps {
  title: string;
  duration: string;
  onClick?: () => void;
  onDownload?: () => void;
  className?: string;
}

export function DownloadCard({
  title,
  duration,
  onClick,
  onDownload,
  className = "",
}: DownloadCardProps) {
  const baseClasses = "flex justify-between items-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer";
  const combinedClasses = className ? `${baseClasses} ${className}` : baseClasses;

  return (
    <div
      className={combinedClasses}
      onClick={onClick}
    >
      <span className="text-sm text-slate-700">{title}</span>
      <small
        className="text-xs text-slate-500 flex items-center gap-1"
        onClick={(e) => {
          e.stopPropagation();
          onDownload?.();
        }}
      >
        {duration} <Download size={14} weight="regular" />
      </small>
    </div>
  );
}

