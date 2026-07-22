import React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  labelPlacement?: "inside" | "outside";
  variant?: "bordered" | "flat";
  minRows?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      labelPlacement = "outside",
      variant = "bordered",
      minRows = 3,
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
        <textarea
          id={id}
          ref={ref}
          rows={minRows}
          className={`w-full rounded-xl text-sm font-medium text-zinc-900 border transition-all duration-200 outline-none pl-4 pr-4 py-2.5 resize-y
            ${
              variant === "bordered"
                ? "border-zinc-200 bg-white hover:border-zinc-400 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                : "border-transparent bg-zinc-100 hover:bg-zinc-200 focus:bg-white focus:border-zinc-950"
            }`}
          {...props}
        />
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
