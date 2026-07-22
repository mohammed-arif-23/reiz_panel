"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, SelectItem } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";
import {
  Send,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
} from "lucide-react";

type LeaveType = "FULL_DAY" | "HALF_DAY" | "HOURLY" | "WFH";
type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

interface LeaveRequest {
  _id: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  comments?: string;
  createdAt?: string;
}

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  FULL_DAY: "Full Day",
  HALF_DAY: "Half Day",
  HOURLY: "Hourly Leave",
  WFH: "Work From Home",
};

const STATUS_STYLES: Record<LeaveStatus, { badge: string; dot: string }> = {
  PENDING: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  APPROVED: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  REJECTED: {
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
};

function StatusBadge({ status }: { status: LeaveStatus }) {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-bold ${styles.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
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

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

export default function LeavePage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [leaveType, setLeaveType] = useState<LeaveType>("FULL_DAY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchLeaves = useCallback(async () => {
    try {
      const res = await fetch("/api/leaves");
      if (res.ok) {
        const data = await res.json();
        const rows: LeaveRequest[] = Array.isArray(data)
          ? data
          : data.leaves ?? data.requests ?? data.data ?? [];
        setLeaves(rows);
      } else {
        setError("Failed to fetch leave requests.");
      }
    } catch {
      setError("An error occurred while loading leave requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // Auto-set endDate to startDate when startDate changes and endDate is before it
  useEffect(() => {
    if (startDate && endDate && endDate < startDate) {
      setEndDate(startDate);
    }
  }, [startDate, endDate]);

  const validate = (): string => {
    if (!startDate) return "Please select a start date.";
    if (!endDate) return "Please select an end date.";
    if (endDate < startDate) return "End date cannot be before start date.";
    if (!reason.trim()) return "Please provide a reason for the leave.";
    if (reason.trim().length < 10) return "Reason must be at least 10 characters.";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setError("");
    setSuccess("");

    const validationErr = validate();
    if (validationErr) {
      setFormError(validationErr);
      return;
    }

    setSubmitLoading(true);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: leaveType,
          startDate,
          endDate,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit leave request.");
      } else {
        setSuccess("Leave request submitted successfully! Awaiting approval.");
        setStartDate("");
        setEndDate("");
        setReason("");
        setLeaveType("FULL_DAY");
        await fetchLeaves();
      }
    } catch {
      setError("An error occurred while submitting. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Stats
  const pending = leaves.filter((l) => l.status === "PENDING").length;
  const approved = leaves.filter((l) => l.status === "APPROVED").length;
  const rejected = leaves.filter((l) => l.status === "REJECTED").length;

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">
          Leave Management
        </h1>
        <p className="text-zinc-500 font-medium mt-1">
          Apply for full day, half day, hourly, or WFH leave and track your request status.
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

      {/* Leave Stats */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
            <p className="text-2xl font-extrabold text-amber-600">{pending}</p>
            <p className="text-xs font-semibold text-zinc-500 mt-0.5">Pending</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
            <p className="text-2xl font-extrabold text-emerald-600">{approved}</p>
            <p className="text-xs font-semibold text-zinc-500 mt-0.5">Approved</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5">
            <p className="text-2xl font-extrabold text-red-600">{rejected}</p>
            <p className="text-xs font-semibold text-zinc-500 mt-0.5">Rejected</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Apply Leave Form ── */}
        <Card className="border border-zinc-200 shadow-sm h-fit lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-zinc-500" />
              <h2 className="text-lg font-bold text-zinc-900">New Leave Request</h2>
            </div>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Leave Type */}
              <Select
                id="leave-type"
                label="Leave Type"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              >
                <SelectItem value="FULL_DAY">Full Day</SelectItem>
                <SelectItem value="HALF_DAY">Half Day</SelectItem>
                <SelectItem value="HOURLY">Hourly Leave</SelectItem>
                <SelectItem value="WFH">Work From Home</SelectItem>
              </Select>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="start-date"
                  label="Start Date"
                  type="date"
                  value={startDate}
                  min={todayStr}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  id="end-date"
                  label="End Date"
                  type="date"
                  value={endDate}
                  min={startDate || todayStr}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              {/* Duration Preview */}
              {startDate && endDate && endDate >= startDate && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <Clock className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                  <span className="text-xs font-semibold text-blue-700">
                    {daysBetween(startDate, endDate)}{" "}
                    {daysBetween(startDate, endDate) === 1 ? "day" : "days"} of{" "}
                    {LEAVE_TYPE_LABELS[leaveType]}
                  </span>
                </div>
              )}

              {/* Reason */}
              <Textarea
                id="leave-reason"
                label="Reason"
                placeholder="Describe the reason for your leave request (min 10 characters)…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                minRows={4}
              />

              {/* Inline form validation error */}
              {formError && (
                <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  {formError}
                </p>
              )}

              <Button
                type="submit"
                isLoading={submitLoading}
                className="w-full"
                startContent={<Send className="h-4 w-4" />}
              >
                Submit Request
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* ── Request History ── */}
        <Card className="border border-zinc-200 shadow-sm lg:col-span-2 overflow-hidden bg-white">
          <CardHeader className="bg-zinc-50 border-b border-zinc-200 py-3 px-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-zinc-500" />
              <h2 className="text-lg font-bold text-zinc-950">Request History</h2>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {loading ? (
              <div className="flex h-48 items-center justify-center gap-2 text-zinc-500 font-semibold">
                <Spinner />
                <span>Loading requests…</span>
              </div>
            ) : leaves.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-zinc-400" />
                </div>
                <p className="text-zinc-400 font-semibold text-sm">No leave requests yet.</p>
                <p className="text-zinc-400 text-xs">Submit a request using the form.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Start</th>
                      <th className="py-3 px-4">End</th>
                      <th className="py-3 px-4">Days</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Comments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {leaves.map((leave) => (
                      <tr
                        key={leave._id}
                        className="hover:bg-zinc-50/60 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-zinc-800 text-xs whitespace-nowrap">
                            {LEAVE_TYPE_LABELS[leave.type] ?? leave.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600 font-semibold text-xs whitespace-nowrap">
                          {formatDate(leave.startDate)}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600 font-semibold text-xs whitespace-nowrap">
                          {formatDate(leave.endDate)}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600 font-semibold text-xs text-center">
                          {daysBetween(leave.startDate, leave.endDate)}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600 font-medium text-xs max-w-[160px]">
                          <span className="line-clamp-2" title={leave.reason}>
                            {leave.reason}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={leave.status} />
                        </td>
                        <td className="py-3.5 px-4 text-zinc-500 font-medium text-xs max-w-[140px]">
                          <span className="line-clamp-2" title={leave.comments}>
                            {leave.comments || "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
