import React from "react";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: "default" | "success" | "warning" | "danger" | "info";
  startContent?: React.ReactNode;
}

export function Alert({
  children,
  color = "default",
  startContent,
  className = "",
  ...props
}: AlertProps) {
  const styles = {
    default: "bg-zinc-50 text-zinc-800 border-zinc-200",
    info: "bg-blue-50 text-blue-800 border-blue-100",
    success: "bg-green-50 text-green-800 border-green-100",
    warning: "bg-amber-50 text-amber-800 border-amber-100",
    danger: "bg-red-50 text-red-800 border-red-100",
  };

  const style = styles[color];

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm font-semibold ${style} ${className}`}
      role="alert"
      {...props}
    >
      {startContent && <div className="flex-shrink-0 mt-0.5">{startContent}</div>}
      <div className="flex-1 leading-normal font-medium">{children}</div>
    </div>
  );
}
