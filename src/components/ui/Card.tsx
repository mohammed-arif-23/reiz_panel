import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", ...props }: CardProps) {
  return (
    <div className={`px-6 py-4.5 border-b border-zinc-100 flex flex-col gap-1 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = "", ...props }: CardProps) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "", ...props }: CardProps) {
  return (
    <div className={`px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-end gap-2.5 ${className}`} {...props}>
      {children}
    </div>
  );
}
