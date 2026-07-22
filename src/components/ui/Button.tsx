import React from "react";
import { Spinner } from "@heroui/react"; // We can use Spinner from HeroUI or standard spinner. Let's make it standard.

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "light" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  startContent?: React.ReactNode;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  startContent,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyle =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 active:scale-95 disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

  const variants = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-zinc-200",
    outline: "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900",
    light: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-5 py-3 text-base",
  };

  const variantStyle = variants[variant];
  const sizeStyle = sizes[size];

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variantStyle} ${sizeStyle} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-1 h-4.5 w-4.5 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!isLoading && startContent}
      {children}
    </button>
  );
}
