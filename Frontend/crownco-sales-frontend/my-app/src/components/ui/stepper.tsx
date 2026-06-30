"use client";

import { useMemo } from "react";
import { CheckCircle } from "phosphor-react";

export interface StepperStep {
  icon: React.ComponentType<{
    size?: number | string;
    weight?: "regular" | "fill" | "bold" | "thin" | "light" | "duotone";
    className?: string;
  }>;
  label: string;
  active?: boolean;
}

export interface StepperProps {
  steps: StepperStep[];
  activeStep?: number;
  className?: string;
  onStepClick?: (stepIndex: number) => void;
  completedSteps?: number[]; // Array of completed step indices
}

export function Stepper({ steps, activeStep, className = "", onStepClick, completedSteps = [] }: StepperProps) {
  // Determine active step index - memoized to prevent hydration issues
  const { currentActiveIndex, progressWidth } = useMemo(() => {
    let index: number;
    if (activeStep !== undefined) {
      index = activeStep;
    } else {
      const foundIndex = steps.findIndex((step) => step.active);
      index = foundIndex !== -1 ? foundIndex : 0;
    }
    
    // Calculate progress width - fill up to the active step
    const width = steps.length > 1 ? (index / (steps.length - 1)) * 100 : 0;
    
    return { currentActiveIndex: index, progressWidth: width };
  }, [activeStep, steps]);

  return (
    <div className={`relative mb-8 md:mb-10 ${className}`}>
      {/* Background Progress Line */}
      <div className="hidden md:block absolute top-6 left-[12%] right-[12%] h-0.5 bg-[#E3E6F0] z-0"></div>
      
      {/* Active Progress Line - fills up to active step */}
      <div
        className="hidden md:block absolute top-6 left-[12%] h-0.5 bg-[var(--primary-base)] z-10 transition-all duration-500"
        style={{ width: `${progressWidth}%` }}
      ></div>

      {/* Steps Container */}
      <div className="flex justify-around items-center relative z-20 px-2 md:px-5 overflow-x-auto">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = activeStep !== undefined ? index === activeStep : step.active || false;
          const isCompleted = activeStep !== undefined 
            ? index < activeStep || completedSteps.includes(index)
            : completedSteps.includes(index);
          const isClickable = isCompleted && onStepClick && index !== currentActiveIndex;

          return (
            <div
              key={index}
              className={`flex flex-col items-center flex-1 min-w-[60px] md:min-w-0 ${
                isActive || isCompleted ? "text-[#2D3748]" : "text-[#718096]"
              }`}
            >
              <div
                onClick={() => isClickable && onStepClick?.(index)}
                className={`w-9 h-9 md:w-12 md:h-12 rounded-lg flex items-center justify-center mb-2 md:mb-3 transition-all ${
                  isClickable ? "cursor-pointer hover:scale-110" : ""
                } ${
                  isCompleted
                    ? "bg-[var(--success)] text-white border-2 border-[var(--success)] shadow-md"
                    : isActive
                    ? "bg-[var(--primary-base)] text-white border-2 border-[var(--primary-base)] shadow-lg scale-105"
                    : "bg-white text-[#718096] border-2 border-[#E3E6F0]"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle size={isActive ? 20 : 18} weight="fill" className="text-white" />
                ) : (
                  <Icon size={isActive ? 20 : 18} weight={isActive ? "fill" : "regular"} />
                )}
              </div>
              <p className={`text-xs md:text-sm ${isActive || isCompleted ? "font-semibold" : "font-medium"}`}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

