"use client";

import React from "react";
import { AlertCircle, X, CheckCircle, AlertTriangle, Info } from "lucide-react";

type AlertType = "info" | "warning" | "error" | "success";

type Alert = {
  id: string;
  type: AlertType;
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
};

type AlertWidgetProps = {
  alerts: Alert[];
  maxItems?: number;
  className?: string;
};

const alertConfig: Record<AlertType, { icon: React.ReactNode; colors: string }> = {
  info: {
    icon: <Info className="w-5 h-5" />,
    colors: "bg-blue-50 border-blue-200 text-blue-800",
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5" />,
    colors: "bg-amber-50 border-amber-200 text-amber-800",
  },
  error: {
    icon: <AlertCircle className="w-5 h-5" />,
    colors: "bg-red-50 border-red-200 text-red-800",
  },
  success: {
    icon: <CheckCircle className="w-5 h-5" />,
    colors: "bg-emerald-50 border-emerald-200 text-emerald-800",
  },
};

export function AlertWidget({
  alerts,
  maxItems = 3,
  className = "",
}: AlertWidgetProps) {
  const displayedAlerts = alerts.slice(0, maxItems);

  if (displayedAlerts.length === 0) return null;

  return (
    <section className={`space-y-2 sm:space-y-3 ${className}`}>
      {displayedAlerts.map((alert) => {
        const config = alertConfig[alert.type];
        return (
          <div
            key={alert.id}
            className={`
              flex items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl border-2
              ${config.colors}
              shadow-[0_2px_8px_rgba(0,0,0,0.04)]
            `}
          >
            <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-semibold mb-1">
                {alert.title}
              </h3>
              {alert.message && (
                <p className="text-xs sm:text-sm opacity-90 mb-2">
                  {alert.message}
                </p>
              )}
              {alert.action && (
                <button
                  onClick={alert.action.onClick}
                  className="text-xs sm:text-sm font-semibold underline hover:no-underline"
                >
                  {alert.action.label}
                </button>
              )}
            </div>
            {alert.onDismiss && (
              <button
                onClick={alert.onDismiss}
                className="flex-shrink-0 p-1 hover:bg-black/10 rounded-lg transition-colors"
                aria-label="Dismiss alert"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}

