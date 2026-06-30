import React from "react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "wave" | "none";
}

export const Skeleton = ({
  className = "",
  variant = "rectangular",
  width,
  height,
  animation = "pulse",
}: SkeletonProps) => {
  const baseClasses = "bg-[var(--surface-neutral)] rounded";
  const variantClasses = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded",
  };
  const animationClasses = {
    pulse: "animate-pulse",
    wave: "animate-[shimmer_2s_infinite]",
    none: "",
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

// KPI Card Skeleton
export const KPICardSkeleton = () => (
  <div className="bg-[var(--background)] p-4 rounded-[10px] border border-[var(--border-color)] shadow-sm">
    <div className="flex justify-between items-center mb-2">
      <Skeleton variant="circular" width={18} height={18} />
      <Skeleton variant="text" width={40} height={12} />
    </div>
    <Skeleton variant="text" width={60} height={24} className="mb-2" />
    <Skeleton variant="text" width="80%" height={12} />
  </div>
);

// Chart Skeleton
export const ChartSkeleton = ({ height = 280 }: { height?: number }) => (
  <div className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm">
    <Skeleton variant="text" width={200} height={24} className="mb-4" />
    <Skeleton variant="rectangular" width="100%" height={height} />
  </div>
);

// Table Skeleton
export const TableSkeleton = ({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) => (
  <div className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm">
    <Skeleton variant="text" width={200} height={24} className="mb-4" />
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} variant="text" width="100%" height={20} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

// Card Skeleton
export const CardSkeleton = () => (
  <div className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm">
    <Skeleton variant="text" width={150} height={20} className="mb-3" />
    <Skeleton variant="rectangular" width="100%" height={120} className="mb-3" />
    <Skeleton variant="text" width="80%" height={16} />
  </div>
);

// List Item Skeleton
export const ListItemSkeleton = () => (
  <div className="p-4 border border-[var(--border-color)] rounded-lg mb-3 bg-[var(--background)]">
    <Skeleton variant="text" width={120} height={16} className="mb-2" />
    <Skeleton variant="text" width={200} height={14} className="mb-2" />
    <div className="flex justify-between items-center">
      <Skeleton variant="text" width={100} height={14} />
      <Skeleton variant="rectangular" width={80} height={24} />
    </div>
  </div>
);

