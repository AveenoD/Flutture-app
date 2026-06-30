"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

// Simple className utility function
function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export type LeadStage = 
  | "qualification" 
  | "communication" 
  | "site-visit" 
  | "negotiation" 
  | "booking";

export interface StepperStage {
  id: LeadStage;
  label: string;
  route: string;
  description?: string;
}

const STAGES: StepperStage[] = [
  {
    id: "qualification",
    label: "Qualification",
    route: "/caller/lead-list/lead-detail/qualification/overview",
    description: "Initial lead qualification",
  },
  {
    id: "communication",
    label: "Communication",
    route: "/caller/lead-list/lead-detail/communication/overview",
    description: "Calls, chats & follow-ups",
  },
  {
    id: "site-visit",
    label: "Site Visit",
    route: "/caller/lead-list/lead-detail/site-visit/overview",
    description: "Property visit planning",
  },
  {
    id: "negotiation",
    label: "Negotiation",
    route: "/caller/lead-list/lead-detail/negotiation/overview",
    description: "Price & unit selection",
  },
  {
    id: "booking",
    label: "Booking",
    route: "/caller/lead-list/lead-detail/booking/overview",
    description: "Final booking & documents",
  },
];

interface StepperProps {
  currentStage?: LeadStage;
  completedStages?: LeadStage[];
  onStageClick?: (stage: StepperStage) => void;
  className?: string;
  showDescriptions?: boolean;
}

export function Stepper({
  currentStage,
  completedStages = [],
  onStageClick,
  className,
  showDescriptions = false,
}: StepperProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auto-detect current stage from pathname if not provided
  const detectedStage = React.useMemo(() => {
    if (currentStage) return currentStage;
    
    for (const stage of STAGES) {
      if (pathname?.startsWith(stage.route)) {
        return stage.id;
      }
    }
    return "qualification" as LeadStage;
  }, [pathname, currentStage]);

  const activeStageIndex = STAGES.findIndex((s) => s.id === detectedStage);

  const handleStageClick = (stage: StepperStage, index: number) => {
    // Allow clicking on completed stages or current stage
    const isCompleted = completedStages.includes(stage.id);
    const isCurrent = stage.id === detectedStage;
    const isPrevious = index < activeStageIndex;

    if (isCompleted || isCurrent || isPrevious) {
      if (onStageClick) {
        onStageClick(stage);
      } else {
        const currentLeadId = searchParams?.get("leadId");
        const target = currentLeadId
          ? `${stage.route}?leadId=${currentLeadId}`
          : stage.route;
        router.push(target);
      }
    }
  };

  const getStageStatus = (stage: StepperStage, index: number) => {
    const isCompleted = completedStages.includes(stage.id);
    const isCurrent = stage.id === detectedStage;
    const isPrevious = index < activeStageIndex;
    const isUpcoming = index > activeStageIndex;

    if (isCompleted) return "completed";
    if (isCurrent) return "current";
    if (isPrevious) return "previous";
    if (isUpcoming) return "upcoming";
    return "upcoming";
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop Stepper */}
      <div className="hidden md:block">
        <div className="">
          <div className="flex items-center justify-between gap-4">
            {STAGES.map((stage, index) => {
              const status = getStageStatus(stage, index);
              const isClickable =
                status === "completed" ||
                status === "current" ||
                status === "previous";

              const baseCircle =
                "w-8 h-8 flex items-center justify-center rounded-full border text-sm font-semibold";

              return (
                <React.Fragment key={stage.id}>
                  <button
                    onClick={() => handleStageClick(stage, index)}
                    disabled={!isClickable}
                    className={cn(
                      "flex flex-col items-center gap-1 flex-1 min-w-0 group transition-all",
                      isClickable && "cursor-pointer hover:opacity-100",
                      !isClickable && "cursor-not-allowed opacity-60"
                    )}
                  >
                    {/* Step label */}
                    <span
                      className={cn(
                        "text-[11px] font-medium uppercase tracking-wide",
                        status === "current"
                          ? "text-[var(--primary-base)]"
                          : status === "completed"
                          ? "text-emerald-600"
                          : "text-slate-400"
                      )}
                    >
                      Step {index + 1}
                    </span>

                    {/* Circle */}
                    <div
                      className={cn(
                        baseCircle,
                        status === "completed" &&
                          "bg-emerald-500 border-emerald-500 text-white",
                        status === "current" &&
                          "bg-[var(--primary-base)] border-[var(--primary-base)] text-white shadow-md ring-4 ring-[var(--primary-base)]/15",
                        (status === "previous" || status === "upcoming") &&
                          "bg-white border-slate-300 text-slate-400 group-hover:border-[var(--primary-base)] group-hover:text-[var(--primary-base)]"
                      )}
                    >
                      {status === "completed" ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        index + 1
                      )}
                    </div>

                    {/* Stage label */}
                    <span
                      className={cn(
                        "mt-1 text-xs sm:text-[13px]",
                        status === "current"
                          ? "font-semibold text-slate-900"
                          : "text-slate-500"
                      )}
                    >
                      {stage.label}
                    </span>

                    {showDescriptions && stage.description && (
                      <span className="mt-0.5 text-[11px] text-slate-400 text-center hidden lg:block">
                        {stage.description}
                      </span>
                    )}
                  </button>

                  {/* Connector */}
                  {index < STAGES.length - 1 && (
                    <div className="flex-1 hidden lg:flex items-center">
                      <div className="w-full h-1 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-300",
                            index < activeStageIndex
                              ? "bg-emerald-500"
                              : index === activeStageIndex
                              ? "bg-[var(--primary-base)]/70"
                              : "bg-transparent"
                          )}
                        />
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Stepper */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {STAGES.map((stage, index) => {
            const status = getStageStatus(stage, index);
            const isClickable =
              status === "completed" ||
              status === "current" ||
              status === "previous";

            return (
              <button
                key={stage.id}
                onClick={() => handleStageClick(stage, index)}
                disabled={!isClickable}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border whitespace-nowrap transition-all",
                  isClickable && "cursor-pointer hover:bg-slate-50",
                  !isClickable && "cursor-not-allowed opacity-60",
                  status === "current" &&
                    "bg-[var(--primary-base)] text-white border-[var(--primary-base)]",
                  status === "completed" &&
                    "bg-emerald-50 text-emerald-700 border-emerald-200",
                  status === "upcoming" &&
                    "bg-white text-slate-500 border-slate-200"
                )}
              >
                <span className="font-semibold">{index + 1}</span>
                <span>{stage.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

