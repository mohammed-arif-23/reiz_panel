"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, AlertCircle, Calendar, Clock, RefreshCw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

interface LeaveUser {
  _id: string;
  name: string;
  email: string;
}

interface Leave {
  _id: string;
  userId: LeaveUser;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  comments?: string;
  createdAt?: string;
}

interface AttendanceCorrection {
  attendanceId: string;
  correctionId: string;
  userName: string;
  userEmail: string;
  date: string;
  proposedCheckIn?: string;
  proposedCheckOut?: string;
  reason: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Spinner({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={`animate-spin ${small ? "h-4 w-4" : "h-5 w-5"} text-current`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  const styles: Record<LeaveStatus, string> = {
    PENDING:  "bg-amber-50 text-amber-700 border-amber-200",
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REJECTED: "bg-red-50 text-red-600 border-red-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${styles[status]}`}>
      {status}
    </span>
  );
}

function formatDateTime(dt?: string) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDateRange(start: string, end: string) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return start === end ? fmt(start) : `${fmt(start)} → ${fmt(end)}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RequestsApprovalPage() {
  const [activeTab,     setActiveTab]     = useState<"corrections" | "leaves">("corrections");
  const [statusFilter,  setStatusFilter]  = useState<"ALL" | LeaveStatus>("PENDING");
  const [corrections,   setCorrections]   = useState<AttendanceCorrection[]>([]);
  const [leaves,        setLeaves]        = useState<Leave[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error,         setError]         = useState("");
  const [success,       setSuccess]       = useState("");
  const [leaveComments, setLeaveComments] = useState<Record<string, string>>({});

  // ── Fetch all data ──
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ovRes, leavesRes] = await Promise.all([
        fetch("/api/admin/overview"),
        fetch("/api/leaves?all=true"),
      ]);

      if (ovRes.ok) {
        const ovData = await ovRes.json();
        setCorrections(ovData.pendingCorrections || []);
      }

      if (leavesRes.ok) {
        const leavesData = await leavesRes.json();
        setLeaves(leavesData.leaves || []);
      }
    } catch {
      setError("Failed to fetch requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // ── Dismiss alert after 5 s ──
  useEffect(() => {
    if (!success && !error) return;
    const t = setTimeout(() => { setSuccess(""); setError(""); }, 5000);
    return () => clearTimeout(t);
  }, [success, error]);

  // ── Handle correction approve/reject ──
  const handleResolveCorrection = async (
    attendanceId: string,
    correctionId: string,
    status: "APPROVED" | "REJECTED"
  ) => {
    const key = `${correctionId}-${status}`;
    setActionLoading(key);
    setError(""); setSuccess("");
    try {
      const res  = await fetch("/api/admin/attendance/correction", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ attendanceId, correctionId, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to resolve correction request.");
      } else {
        setSuccess(`Correction request ${status.toLowerCase()} successfully.`);
        await fetchRequests();
      }
    } catch {
      setError("An error occurred while resolving correction.");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Handle leave approve/reject ──
  const handleResolveLeave = async (leaveId: string, status: "APPROVED" | "REJECTED") => {
    const key = `${leaveId}-${status}`;
    setActionLoading(key);
    setError(""); setSuccess("");
    const comments = leaveComments[leaveId] || "";
    try {
      const res  = await fetch(`/api/leaves/${leaveId}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status, comments }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to process leave request.");
      } else {
        setSuccess(`Leave request ${status.toLowerCase()} successfully.`);
        setLeaveComments((prev) => { const next = { ...prev }; delete next[leaveId]; return next; });
        await fetchRequests();
      }
    } catch {
      setError("An error occurred while processing leave request.");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Filtered leaves ──
  const filteredLeaves = statusFilter === "ALL"
    ? leaves
    : leaves.filter((l) => l.status === statusFilter);

  // ─── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center gap-3 text-sm font-semibold text-zinc-500">
        <Spinner />
        <span>Loading approval requests…</span>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">
            Corrections &amp; Leave Requests
          </h1>
          <p className="text-sm text-zinc-500 font-medium mt-1">
            Review and action employee attendance corrections and leave applications.
          </p>
        </div>

        <button
          onClick={fetchRequests}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2.5 rounded-xl text-sm font-semibold border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 transition-all duration-200 cursor-pointer"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-800" role="alert">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-800" role="alert">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      {/* ── Tab Bar ── */}
      <div className="flex gap-2 p-1 bg-white border border-zinc-200 rounded-xl shadow-sm w-fit">
        <button
          id="tab-corrections"
          onClick={() => setActiveTab("corrections")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
            activeTab === "corrections"
              ? "bg-zinc-950 text-white shadow-sm"
              : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Attendance Corrections</span>
          {corrections.length > 0 && (
            <span className="text-[10px] font-bold bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded-full">
              {corrections.length}
            </span>
          )}
        </button>

        <button
          id="tab-leaves"
          onClick={() => setActiveTab("leaves")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
            activeTab === "leaves"
              ? "bg-zinc-950 text-white shadow-sm"
              : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Leave Requests</span>
          {leaves.filter((l) => l.status === "PENDING").length > 0 && (
            <span className="text-[10px] font-bold bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded-full">
              {leaves.filter((l) => l.status === "PENDING").length}
            </span>
          )}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CORRECTIONS TAB                                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "corrections" && (
        <div className="space-y-4">
          {corrections.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
              <Clock className="h-10 w-10 opacity-30" />
              <p className="text-sm font-semibold">No pending attendance correction requests.</p>
            </div>
          ) : (
            corrections.map((corr) => (
              <div
                key={corr.correctionId}
                className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-5"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left: details */}
                  <div className="space-y-3 flex-1 min-w-0">
                    <div>
                      <h3 className="font-bold text-zinc-900 text-base">{corr.userName}</h3>
                      <p className="text-xs text-zinc-400 font-medium mt-0.5">
                        {corr.userEmail}
                        <span className="mx-2 text-zinc-200">|</span>
                        Date: {corr.date}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 max-w-sm bg-zinc-50 border border-zinc-150 p-3 rounded-xl text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Proposed Check-In</span>
                        <p className="font-bold text-zinc-800 mt-0.5">{formatDateTime(corr.proposedCheckIn)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Proposed Check-Out</span>
                        <p className="font-bold text-zinc-800 mt-0.5">{formatDateTime(corr.proposedCheckOut)}</p>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Reason / Remarks</span>
                      <p className="text-sm text-zinc-700 font-medium mt-0.5 leading-relaxed">{corr.reason || "—"}</p>
                    </div>
                  </div>

                  {/* Right: action buttons */}
                  <div className="flex gap-2.5 self-end md:self-start flex-shrink-0">
                    <button
                      disabled={actionLoading !== null}
                      onClick={() => handleResolveCorrection(corr.attendanceId, corr.correctionId, "REJECTED")}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-600 bg-white hover:bg-red-50 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                      {actionLoading === `${corr.correctionId}-REJECTED` ? <Spinner small /> : <XCircle className="h-4 w-4" />}
                      Reject
                    </button>
                    <button
                      disabled={actionLoading !== null}
                      onClick={() => handleResolveCorrection(corr.attendanceId, corr.correctionId, "APPROVED")}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                      {actionLoading === `${corr.correctionId}-APPROVED` ? <Spinner small /> : <CheckCircle2 className="h-4 w-4" />}
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* LEAVES TAB                                                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "leaves" && (
        <div className="space-y-4">
          {/* Status filter pills */}
          <div className="flex flex-wrap gap-2">
            {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200 cursor-pointer ${
                  statusFilter === s
                    ? "bg-zinc-950 text-white border-zinc-950"
                    : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-400"
                }`}
              >
                {s}
                {s !== "ALL" && (
                  <span className="ml-1.5 opacity-70">
                    ({leaves.filter((l) => l.status === s).length})
                  </span>
                )}
                {s === "ALL" && (
                  <span className="ml-1.5 opacity-70">({leaves.length})</span>
                )}
              </button>
            ))}
          </div>

          {/* Leave table */}
          {filteredLeaves.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
              <Calendar className="h-10 w-10 opacity-30" />
              <p className="text-sm font-semibold">No {statusFilter !== "ALL" ? statusFilter.toLowerCase() : ""} leave requests found.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200">
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wide">Employee</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wide">Type</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wide">Duration</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wide">Reason</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wide text-center">Status</th>
                    <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredLeaves.map((leave) => (
                    <tr key={leave._id} className="hover:bg-zinc-50/60 transition-colors align-top">
                      {/* Employee */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-900">{leave.userId?.name}</div>
                        <div className="text-xs text-zinc-400 font-medium mt-0.5">{leave.userId?.email}</div>
                      </td>

                      {/* Leave type */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border border-zinc-200 bg-zinc-50 text-zinc-700">
                          {leave.type.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-4 text-xs font-semibold text-zinc-600 whitespace-nowrap">
                        {formatDateRange(leave.startDate, leave.endDate)}
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 text-xs text-zinc-600 max-w-xs">
                        <p className="line-clamp-2">{leave.reason || "—"}</p>
                      </td>

                      {/* Status badge */}
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={leave.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4">
                        {leave.status === "PENDING" ? (
                          <div className="flex flex-col gap-2 items-end">
                            {/* Reviewer comment input */}
                            <input
                              type="text"
                              placeholder="Reviewer comment (optional)"
                              value={leaveComments[leave._id] || ""}
                              onChange={(e) =>
                                setLeaveComments((prev) => ({ ...prev, [leave._id]: e.target.value }))
                              }
                              className="w-48 rounded-lg text-xs font-medium text-zinc-800 border border-zinc-200 bg-white hover:border-zinc-400 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 outline-none px-3 py-1.5 transition-all duration-200"
                            />
                            <div className="flex gap-2">
                              <button
                                disabled={actionLoading !== null}
                                onClick={() => handleResolveLeave(leave._id, "REJECTED")}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 bg-white hover:bg-red-50 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                              >
                                {actionLoading === `${leave._id}-REJECTED` ? <Spinner small /> : <XCircle className="h-3.5 w-3.5" />}
                                Reject
                              </button>
                              <button
                                disabled={actionLoading !== null}
                                onClick={() => handleResolveLeave(leave._id, "APPROVED")}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                              >
                                {actionLoading === `${leave._id}-APPROVED` ? <Spinner small /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                Approve
                              </button>
                            </div>
                            {leave.comments && (
                              <p className="text-[10px] text-zinc-400 italic max-w-[200px] text-right">
                                Prev: &ldquo;{leave.comments}&rdquo;
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-right">
                            {leave.comments ? (
                              <p className="text-[10px] text-zinc-400 italic max-w-[180px] ml-auto">
                                &ldquo;{leave.comments}&rdquo;
                              </p>
                            ) : (
                              <span className="text-zinc-300 text-xs">—</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
