"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Grid,
  FileText,
  User as UserIcon,
  LogOut,
  Shield,
  Bell,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface SidebarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    designation: string;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        const unread = data.notifications.filter((n: any) => !n.isRead).length;
        setUnreadNotifications(unread);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Simplified navigation list (No unnecessary ongoing/completed todo tabs)
  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Calendar View", href: "/dashboard/calendar", icon: Calendar },
    { name: "Monthly Sheet", href: "/dashboard/monthly-sheet", icon: Grid },
    { name: "Content Scripts", href: "/dashboard/scripts", icon: FileText },
    { name: "Leave Requests", href: "/dashboard/leave", icon: FileText },
    { name: "Profile", href: "/dashboard/profile", icon: UserIcon },
  ];

  const hasAdminAccess = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(user.role);

  return (
    <>
      {/* Mobile Top Bar with Warm Palette */}
      <div className="flex items-center justify-between border-b border-[#E8DFD3] bg-[#FAF6F0] px-4 py-3 md:hidden w-full sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#362722] text-[#FAF6F0] font-black text-lg">
            R
          </div>
          <span className="font-bold text-lg tracking-tight text-[#2D221E]">REIZ Media</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/profile" className="relative">
            <Bell className="h-5 w-5 text-[#8C7A6B]" />
            {unreadNotifications > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#B87C4C] text-[9px] font-extrabold text-white">
                {unreadNotifications}
              </span>
            )}
          </Link>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded-lg p-1.5 text-[#2D221E] hover:bg-[#F5EFE6]"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#2D221E]/30 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <aside
        className={`fixed bottom-0 top-[57px] z-40 flex w-64 flex-col border-r border-[#E8DFD3] bg-[#FAF6F0] transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Desktop Header */}
        <div className="hidden items-center gap-3 border-b border-[#E8DFD3] px-6 py-5 md:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#362722] text-[#FAF6F0] font-black text-xl shadow-sm">
            R
          </div>
          <div>
            <h1 className="font-bold text-[#2D221E] tracking-tight text-lg">REIZ Media</h1>
            <p className="text-[10px] font-bold text-[#B87C4C] uppercase tracking-widest">Pulse Portal</p>
          </div>
        </div>

        {/* User profile avatar */}
        <div className="border-b border-[#E8DFD3] px-6 py-4 flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#362722] text-[#FAF6F0] font-bold text-sm">
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#2D221E] truncate">{user.name}</p>
            <p className="text-xs text-[#8C7A6B] truncate font-medium">{user.designation || user.role}</p>
          </div>
        </div>

        {/* Links */}
        <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-[#362722] text-[#FAF6F0] shadow-sm"
                    : "text-[#8C7A6B] hover:bg-[#F5EFE6] hover:text-[#2D221E]"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-[#C68B59]" : "text-[#8C7A6B]"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {hasAdminAccess && (
            <div className="pt-4 mt-4 border-t border-[#E8DFD3]">
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#B87C4C] bg-[#F7EBE1] hover:bg-[#E8DFD3] transition-colors"
              >
                <Shield className="h-5 w-5 text-[#B87C4C]" />
                <span>Admin Panel</span>
              </Link>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-[#E8DFD3] p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-red-700 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
