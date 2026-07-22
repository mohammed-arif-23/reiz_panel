import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  scrollBehavior?: "normal" | "inside";
}

export function Modal({ isOpen, onOpenChange, size = "md", children }: ModalProps) {
  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  };

  const sizeClass = sizes[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/20 backdrop-blur-sm">
      <div
        className="fixed inset-0"
        onClick={() => onOpenChange(false)}
      />
      <div className={`relative w-full ${sizeClass} bg-white border border-zinc-200 shadow-xl rounded-2xl overflow-hidden transition-all duration-300 max-h-[90vh] flex flex-col z-10 animate-in fade-in zoom-in-95`}>
        {children}
      </div>
    </div>
  );
}

export function ModalContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function ModalHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-4.5 border-b border-zinc-150 flex items-center justify-between ${className}`}>
      <h3 className="text-lg font-bold text-zinc-950">{children}</h3>
    </div>
  );
}

export function ModalBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 overflow-y-auto ${className}`}>{children}</div>;
}

export function ModalFooter({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-4 border-t border-zinc-150 bg-zinc-50/50 flex items-center justify-end gap-2.5 ${className}`}>
      {children}
    </div>
  );
}
export function useDisclosure() {
  const [isOpen, setIsOpen] = useState(false);
  return {
    isOpen,
    onOpen: () => setIsOpen(true),
    onClose: () => setIsOpen(false),
    onOpenChange: (val: boolean) => setIsOpen(val),
  };
}
import { useState } from "react";
