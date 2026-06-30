"use client";

import React, { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

/**
 * Button variant types
 */
export type ButtonVariant = "primary" | "secondary" | "danger" | "outline" | "ghost";

/**
 * Button size types
 */
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Button Component Props
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant - determines color scheme */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Whether button is in loading state */
  isLoading?: boolean;
  /** Icon to display before text */
  leftIcon?: React.ReactNode;
  /** Icon to display after text */
  rightIcon?: React.ReactNode;
  /** Whether button should take full width */
  fullWidth?: boolean;
  /** Children content */
  children: React.ReactNode;
}

/**
 * Standardized Button Component
 * Provides consistent styling and behavior across the application
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click Me
 * </Button>
 * 
 * <Button variant="primary" isLoading={isLoading} leftIcon={<Icon />}>
 *   Save
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = "",
      disabled,
      children,
      ...props
    },
    ref
  ) {
    // Variant styles
    const variantStyles = {
      primary:
        "bg-[var(--primary-base)] text-white hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2",
      secondary:
        "bg-[var(--secondary-base)] text-white hover:bg-[var(--secondary-hover)] active:bg-[var(--secondary-active)] focus:ring-2 focus:ring-[var(--secondary-base)] focus:ring-offset-2",
      danger:
        "bg-[var(--error)] text-white hover:bg-[#9a3a3a] active:bg-[#8a2a2a] focus:ring-2 focus:ring-[var(--error)] focus:ring-offset-2",
      outline:
        "border-2 border-[var(--primary-base)] text-[var(--primary-base)] bg-transparent hover:bg-[var(--primary-selected)] focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2",
      ghost:
        "text-[var(--primary-base)] bg-transparent hover:bg-[var(--primary-selected)] focus:ring-2 focus:ring-[var(--primary-base)] focus:ring-offset-2",
    };

    // Size styles
    const sizeStyles = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    const baseStyles =
      "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none";

    const combinedClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${fullWidth ? "w-full" : ""}
      ${className}
    `.trim().replace(/\s+/g, " ");

    return (
      <button
        ref={ref}
        className={combinedClassName}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span className="sr-only">Loading</span>
          </>
        ) : (
          <>
            {leftIcon && <span aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

