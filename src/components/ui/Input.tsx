import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  startContent?: React.ReactNode;
  endContent?: React.ReactNode;
  labelPlacement?: "inside" | "outside";
  variant?: "bordered" | "flat";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      startContent,
      endContent,
      labelPlacement = "outside",
      variant = "bordered",
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    return (
      <div className={`w-full flex flex-col gap-1.5 ${className}`}>
        {label && (
          <label htmlFor={id} className="text-xs font-semibold text-zinc-700">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {startContent && (
            <div className="absolute left-3.5 flex items-center text-zinc-400">
              {startContent}
            </div>
          )}
          <input
            id={id}
            ref={ref}
            className={`w-full rounded-xl text-sm font-medium text-zinc-900 border transition-all duration-200 outline-none
              ${startContent ? "pl-10.5" : "pl-4"}
              ${endContent ? "pr-10.5" : "pr-4"}
              ${
                variant === "bordered"
                  ? "border-zinc-200 bg-white hover:border-zinc-400 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                  : "border-transparent bg-zinc-100 hover:bg-zinc-200 focus:bg-white focus:border-zinc-950"
              }
              py-2.5 h-11`}
            {...props}
          />
          {endContent && (
            <div className="absolute right-3.5 flex items-center text-zinc-400">
              {endContent}
            </div>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = "Input";
