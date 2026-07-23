"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import {
  User as UserIcon,
  Bell,
  CheckCircle2,
  AlertCircle,
  Mail,
  Briefcase,
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  BadgeCheck,
} from "lucide-react";

interface UserProfile {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  designation?: string;
  department?: string;
  joinDate?: string;
  assignedTemplateId?: { name: string } | null;
}

interface Notification {
  _id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type?: string;
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <Input
      id={id}
      label={label}
      type={show ? "text" : "password"}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      endContent={
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="text-zinc-400 hover:text-zinc-700 transition-colors focus:outline-none"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
    />
  );
}

function validatePassword(pw: string): string {
  if (!pw) return "Password is required.";
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Must contain at least one uppercase letter.";
  if (!/[0-9]/.test(pw)) return "Must contain at least one number.";
  return "";
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const fetchProfile = useCallback(async () => {
    try {
      const [userRes, notifRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/notifications"),
      ]);

      if (userRes.ok) {
        const userData = await userRes.json();
        // Normalise various response shapes
        setUser(userData.user ?? userData.data ?? userData);
      } else {
        setError("Failed to load profile. Please refresh the page.");
      }

      if (notifRes.ok) {
        const notifData = await notifRes.json();
        const rows: Notification[] = Array.isArray(notifData)
          ? notifData
          : notifData.notifications ?? notifData.data ?? [];
        setNotifications(rows);
      }
      // Notifications failing is non-critical, don't surface error
    } catch {
      setError("An error occurred while loading profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(t);
    }
  }, [success]);

  useEffect(() => {
    if (passwordSuccess) {
      const t = setTimeout(() => setPasswordSuccess(""), 5000);
      return () => clearTimeout(t);
    }
  }, [passwordSuccess]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }
    const newPwErr = validatePassword(newPassword);
    if (newPwErr) {
      setPasswordError(newPwErr);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError("New password must differ from the current password.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Failed to update password.");
      } else {
        setPasswordSuccess("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPasswordError("An error occurred. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
        );
      }
    } catch {
      // silent
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch {
      // silent
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const avatarLetter = user?.name?.charAt(0)?.toUpperCase() ?? "?";

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center gap-2 text-zinc-500 font-semibold">
        <Spinner />
        <span>Loading profile…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">
          Profile & Settings
        </h1>
        <p className="text-zinc-500 font-medium mt-1">
          View your account details and manage your credentials.
        </p>
      </div>

      {/* Global Alerts */}
      {error && (
        <Alert color="danger" startContent={<AlertCircle className="h-5 w-5" />}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert color="success" startContent={<CheckCircle2 className="h-5 w-5" />}>
          {success}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left column ── */}
        <div className="space-y-6 lg:col-span-1">
          {/* Profile Info Card */}
          <Card className="border border-zinc-200 shadow-sm bg-white">
            <CardBody className="p-0">
              {/* Gradient banner */}
              <div className="h-20 rounded-t-2xl bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-600" />
              <div className="px-6 pb-6">
                {/* Avatar */}
                <div className="-mt-10 mb-4">
                  <div className="h-20 w-20 rounded-full border-4 border-white bg-zinc-900 flex items-center justify-center shadow-lg">
                    <span className="text-3xl font-extrabold text-white">{avatarLetter}</span>
                  </div>
                </div>

                {user ? (
                  <>
                    <div className="mb-1 flex items-center gap-2">
                      <h2 className="text-xl font-bold text-zinc-900">{user.name}</h2>
                      <BadgeCheck className="h-5 w-5 text-zinc-400" />
                    </div>
                    <p className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-5">
                      {user.designation || user.role}
                    </p>

                    <div className="space-y-3.5 text-sm">
                      <div className="flex items-start gap-3">
                        <Mail className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-zinc-400 font-semibold">Email</p>
                          <p className="text-zinc-800 font-medium break-all">{user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Shield className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-zinc-400 font-semibold">Role</p>
                          <p className="text-zinc-800 font-medium capitalize">
                            {user.role?.toLowerCase().replace(/_/g, " ")}
                          </p>
                        </div>
                      </div>

                      {user.department && (
                        <div className="flex items-start gap-3">
                          <Briefcase className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-zinc-400 font-semibold">Department</p>
                            <p className="text-zinc-800 font-medium">{user.department}</p>
                          </div>
                        </div>
                      )}

                      {user.joinDate && (
                        <div className="flex items-start gap-3">
                          <UserIcon className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-zinc-400 font-semibold">Joined</p>
                            <p className="text-zinc-800 font-medium">
                              {new Date(user.joinDate).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      )}

                      {user.assignedTemplateId && (
                        <div className="flex items-start gap-3">
                          <UserIcon className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-zinc-400 font-semibold">Deliverables Sheet</p>
                            <p className="text-zinc-800 font-medium">
                              {user.assignedTemplateId.name}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-zinc-400 font-medium">Profile data unavailable.</p>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Change Password Card */}
          <Card className="border border-zinc-200 shadow-sm bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-zinc-500" />
                <h3 className="text-base font-bold text-zinc-900">Change Password</h3>
              </div>
            </CardHeader>
            <CardBody>
              {passwordError && (
                <Alert color="danger" startContent={<AlertCircle className="h-4 w-4" />} className="mb-4 text-xs">
                  {passwordError}
                </Alert>
              )}
              {passwordSuccess && (
                <Alert color="success" startContent={<CheckCircle2 className="h-4 w-4" />} className="mb-4 text-xs">
                  {passwordSuccess}
                </Alert>
              )}
              <form onSubmit={handlePasswordChange} className="space-y-4" noValidate>
                <PasswordInput
                  id="current-password"
                  label="Current Password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
                <PasswordInput
                  id="new-password"
                  label="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                />
                <PasswordInput
                  id="confirm-password"
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                />

                {/* Password strength indicator */}
                {newPassword && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-zinc-400">Password strength</p>
                    <div className="flex gap-1">
                      {[
                        newPassword.length >= 8,
                        /[A-Z]/.test(newPassword),
                        /[0-9]/.test(newPassword),
                        /[^A-Za-z0-9]/.test(newPassword),
                      ].map((met, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            met ? "bg-emerald-500" : "bg-zinc-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      8+ chars · uppercase · number · special char (optional)
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  isLoading={passwordLoading}
                  className="w-full"
                  startContent={<KeyRound className="h-4 w-4" />}
                >
                  Update Password
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>

        {/* ── Notifications ── */}
        <Card className="border border-zinc-200 shadow-sm lg:col-span-2 overflow-hidden bg-white">
          <CardHeader className="bg-zinc-50 border-b border-zinc-200 py-3 px-6 flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-zinc-500" />
              <h3 className="text-base font-bold text-zinc-950">Notification Inbox</h3>
              {unreadCount > 0 && (
                <span className="h-5 w-5 rounded-full bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="light"
                onClick={handleMarkAllAsRead}
                className="text-xs text-zinc-600 px-3 py-1.5 h-8"
              >
                Mark All Read
              </Button>
            )}
          </CardHeader>
          <CardBody className="p-0">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-zinc-400" />
                </div>
                <p className="text-zinc-400 font-semibold text-sm">No notifications yet.</p>
                <p className="text-zinc-400 text-xs">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 max-h-[640px] overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif._id}
                    className={`p-4 flex items-start gap-4 transition-colors group ${
                      notif.isRead ? "bg-white" : "bg-zinc-50/60"
                    }`}
                  >
                    {/* Dot indicator */}
                    <div className="mt-1.5 flex-shrink-0">
                      <span
                        className={`h-2 w-2 rounded-full block ${
                          notif.isRead ? "bg-zinc-200" : "bg-zinc-900"
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <h4
                        className={`text-sm font-semibold leading-tight ${
                          notif.isRead ? "text-zinc-500" : "text-zinc-900"
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-semibold">
                        {new Date(notif.createdAt).toLocaleString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {!notif.isRead && (
                      <Button
                        variant="outline"
                        onClick={() => handleMarkAsRead(notif._id)}
                        className="text-[11px] text-zinc-600 py-1 px-2.5 h-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Mark Read
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
