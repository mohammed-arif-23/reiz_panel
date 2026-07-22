import React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  labelPlacement?: "inside" | "outside";
  variant?: "bordered" | "flat";
  selectedKeys?: Array<string | number> | string | number | undefined;
}

export function Select({
  label,
  children,
  labelPlacement = "outside",
  variant = "bordered",
  className = "",
  id,
  selectedKeys,
  value,
  ...props
}: SelectProps) {
  // Translate selectedKeys to value if needed
  let actualValue = value;
  if (selectedKeys !== undefined) {
    if (Array.isArray(selectedKeys)) {
      actualValue = selectedKeys[0];
    } else if ((selectedKeys as any) instanceof Set) {
      actualValue = Array.from(selectedKeys as any)[0] as any;
    } else {
      actualValue = selectedKeys as any;
    }
  }

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-zinc-700">
          {label}
        </label>
      )}
      <div className="relative w-full">
        <select
          id={id}
          value={actualValue}
          className={`w-full rounded-xl text-sm font-medium text-zinc-800 border transition-all duration-200 outline-none appearance-none cursor-pointer pr-10
            ${
              variant === "bordered"
                ? "border-zinc-200 bg-white hover:border-zinc-400 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                : "border-transparent bg-zinc-100 hover:bg-zinc-200 focus:bg-white focus:border-zinc-950"
            }
            pl-4 py-2.5 h-11`}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-zinc-400">
          <svg className="fill-current h-4.5 w-4.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

interface SelectItemProps extends React.OptionHTMLAttributes<HTMLOptionElement> {}

export function SelectItem({ children, value, ...props }: SelectItemProps) {
  return (
    <option value={value} className="text-zinc-800 bg-white py-2" {...props}>
      {children}
    </option>
  );
}
