"use client";

import React, { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import {
  Play,
  Pause,
  LogOut,
  LogIn,
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar as CalendarIcon,
  Grid as GridIcon,
  FileText
} from "lucide-react";
import Link from "next/link";

interface AttendanceStatus {
  date: string;
  checkedIn: boolean;
  checkedOut: boolean;
  onBreak: boolean;
  attendance: any;
}

export default function Dashboard() {
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [workHoursStr, setWorkHoursStr] = useState("00:00:00");
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/attendance/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch attendance status.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        if (data.sheet && data.sheet.tasks) {
          setTasks(data.sheet.tasks);
        } else {
          setTasks([]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch today's tasks:", err);
    } finally {
      setTasksLoading(false);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setSuccess("Task status updated successfully!");
        fetchTodayTasks();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update task status.");
      }
    } catch {
      setError("An error occurred while updating task status.");
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchTodayTasks();
  }, []);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(t);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(""), 8000);
      return () => clearTimeout(t);
    }
  }, [error]);

  useEffect(() => {
    if (!status?.checkedIn || status.checkedOut) return;

    const interval = setInterval(() => {
      const checkInTime = new Date(status.attendance.checkIn).getTime();
      const now = new Date().getTime();
      let totalMs = now - checkInTime;

      let breakMs = (status.attendance.breakDurationMinutes || 0) * 60 * 1000;
      if (status.onBreak && status.attendance.currentBreakStart) {
        const breakStart = new Date(status.attendance.currentBreakStart).getTime();
        breakMs += now - breakStart;
      }

      const workMs = Math.max(0, totalMs - breakMs);

      const formatTime = (ms: number) => {
        const totalSecs = Math.floor(ms / 1000);
        const hours = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
      };

      setWorkHoursStr(formatTime(workMs));
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/attendance/check-in", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        fetchStatus();
      } else {
        setError(data.error || "Check-in failed.");
      }
    } catch {
      setError("An error occurred during check-in.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/attendance/check-out", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        fetchStatus();
      } else {
        setError(data.error || "Check-out failed.");
      }
    } catch {
      setError("An error occurred during check-out.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartBreak = async () => {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/attendance/break/start", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        fetchStatus();
      } else {
        setError(data.error || "Break start failed.");
      }
    } catch {
      setError("An error occurred starting break.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/attendance/break/end", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        fetchStatus();
      } else {
        setError(data.error || "Break end failed.");
      }
    } catch {
      setError("An error occurred ending break.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-[#8C7A6B] font-bold text-sm animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#2D221E] md:text-3xl">Employee Dashboard</h1>
        <p className="text-[#8C7A6B] font-bold mt-1 text-xs sm:text-sm">
          REIZ Media Operations & Real-Time Shift Tracking
        </p>
      </div>

      {error && (
        <Alert color="danger" startContent={<AlertCircle className="h-5 w-5" />}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert color="success" startContent={<CheckCircle className="h-5 w-5" />}>
          {success}
        </Alert>
      )}

      {/* Main Grid Layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Attendance Duty Card */}
        <Card className="border border-[#E8DFD3] shadow-sm md:col-span-2 bg-[#FAF6F0]">
          <CardHeader className="flex flex-col items-start gap-1 pb-2 border-b border-[#E8DFD3]">
            <h2 className="text-base font-black text-[#2D221E]">Duty Shift Session</h2>
            <p className="text-xs text-[#8C7A6B] font-bold">Record check-in and checkout timestamps for today</p>
          </CardHeader>
          <CardBody className="space-y-6 pt-4">
            {/* Live Timer */}
            {status?.checkedIn && !status.checkedOut && (
              <div className="rounded-2xl bg-white border border-[#E8DFD3] p-5 text-center shadow-xs">
                <span className="flex items-center justify-center gap-1.5 text-xs text-[#8C7A6B] font-bold uppercase tracking-wider">
                  <Clock className="h-4 w-4 text-[#B87C4C]" /> Active Working Hours
                </span>
                <p className="mt-2 font-mono text-4xl font-black text-[#2D221E]">{workHoursStr}</p>
              </div>
            )}

            {status?.checkedIn && status.checkedOut && (
              <div className="rounded-2xl bg-[#F7EBE1] border border-[#E8DFD3] p-5 text-center">
                <CheckCircle className="mx-auto h-8 w-8 text-[#B87C4C]" />
                <h3 className="mt-2 text-sm font-black text-[#2D221E]">Shift Completed for Today</h3>
                <p className="text-xs text-[#8C7A6B] font-bold mt-1">
                  Check-in: {new Date(status.attendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} |
                  Check-out: {new Date(status.attendance.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-[#2D221E] font-extrabold mt-2">
                  Total Work Duration: {status.attendance.workDurationMinutes} mins
                </p>
              </div>
            )}

            {/* Actions Buttons */}
            <div className="flex flex-wrap gap-3">
              {!status?.checkedIn && (
                <button
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#362722] text-[#FAF6F0] font-bold py-3 px-6 text-sm flex-1 min-w-[160px] shadow-sm hover:bg-[#261A16] transition-colors"
                >
                  <LogIn className="h-4 w-4 text-[#C68B59]" />
                  Start Work Shift (Check In)
                </button>
              )}

              {status?.checkedIn && !status.checkedOut && (
                <>
                  {!status.onBreak ? (
                    <button
                      onClick={handleStartBreak}
                      disabled={actionLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E8DFD3] bg-white text-[#2D221E] font-bold py-3 px-4 text-xs flex-1 min-w-[130px] hover:bg-[#F5EFE6] transition-colors"
                    >
                      <Pause className="h-4 w-4 text-[#B87C4C]" />
                      Pause (Start Break)
                    </button>
                  ) : (
                    <button
                      onClick={handleEndBreak}
                      disabled={actionLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#362722] text-[#FAF6F0] font-bold py-3 px-4 text-xs flex-1 min-w-[130px]"
                    >
                      <Play className="h-4 w-4 text-[#C68B59]" />
                      Resume Work
                    </button>
                  )}

                  <button
                    onClick={handleCheckOut}
                    disabled={actionLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 text-white font-bold py-3 px-4 text-xs flex-1 min-w-[130px] hover:bg-red-800 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    End Shift (Check Out)
                  </button>
                </>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Deliverables Direct Quick Action */}
        <Card className="border border-[#E8DFD3] shadow-sm bg-white flex flex-col justify-between">
          <CardHeader className="pb-2">
            <h2 className="text-base font-black text-[#2D221E]">Log Work Deliverables</h2>
            <p className="text-xs text-[#8C7A6B] font-bold mt-0.5">Directly log multiple work items finished today</p>
          </CardHeader>
          <CardBody className="flex flex-col justify-between space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-[#FAF6F0] border border-[#E8DFD3] text-xs font-bold text-[#8C7A6B] space-y-2">
              <p>• Click <span className="text-[#2D221E]">Calendar View</span> to add multiple work entries per day.</p>
              <p>• Review your whole month in the <span className="text-[#2D221E]">Monthly Sheet</span>.</p>
            </div>

            <div className="space-y-2 pt-2">
              <Link href="/dashboard/calendar" className="w-full block">
                <button className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#362722] text-[#FAF6F0] py-2.5 text-xs font-bold hover:bg-[#261A16] transition-colors shadow-xs">
                  <CalendarIcon className="h-4 w-4 text-[#C68B59]" />
                  Open Work Log Calendar
                </button>
              </Link>
              <Link href="/dashboard/monthly-sheet" className="w-full block">
                <button className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#E8DFD3] bg-white text-[#2D221E] py-2 text-xs font-bold hover:bg-[#F5EFE6] transition-colors">
                  <GridIcon className="h-4 w-4 text-[#8C7A6B]" />
                  Open Monthly Grid
                </button>
              </Link>
            </div>
          </CardBody>
        </Card>

        {/* Tasks Assigned for Today */}
        <Card className="border border-[#E8DFD3] shadow-sm bg-white md:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-[#E8DFD3] bg-[#F5EFE6]">
            <div>
              <h2 className="text-base font-black text-[#2D221E]">Tasks Assigned for Today</h2>
              <p className="text-xs text-[#8C7A6B] font-bold">Track and update the status of your assigned tasks</p>
            </div>
            <span className="text-xs bg-[#362722] text-[#FAF6F0] px-2.5 py-1 rounded-full font-bold">
              {tasks.length} {tasks.length === 1 ? "Task" : "Tasks"}
            </span>
          </CardHeader>
          <CardBody className="p-6">
            {tasksLoading ? (
              <p className="text-xs text-[#8C7A6B] font-bold animate-pulse">Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm font-extrabold text-[#2D221E]">🎉 No tasks assigned for today!</p>
                <p className="text-xs text-[#8C7A6B] mt-1">Check back later or log your deliverables directly.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E8DFD3]">
                {tasks.map((task) => (
                  <div key={task._id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-extrabold text-[#2D221E]">{task.title}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          task.priority === "HIGH" ? "bg-red-50 text-red-700 border border-red-100" :
                          task.priority === "MEDIUM" ? "bg-amber-50 text-amber-800 border border-amber-100" :
                          "bg-[#FAF6F0] text-zinc-600 border border-zinc-200"
                        }`}>
                          {task.priority} Priority
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-xs text-[#8C7A6B] font-medium leading-relaxed">{task.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <label className="text-[10px] font-black uppercase text-[#8C7A6B] whitespace-nowrap">Status:</label>
                      <select
                        value={task.status}
                        onChange={(e) => handleTaskStatusChange(task._id, e.target.value)}
                        className={`rounded-lg border border-[#E8DFD3] px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#362722] ${
                          task.status === "APPROVED" ? "bg-emerald-50 text-emerald-800" :
                          task.status === "WAITING_FOR_REVIEW" ? "bg-blue-50 text-blue-800" :
                          task.status === "IN_PROGRESS" ? "bg-amber-50 text-amber-800" :
                          "bg-white text-[#2D221E]"
                        }`}
                      >
                        <option value="NOT_STARTED">Not Started</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="WAITING_FOR_REVIEW">Waiting for Review</option>
                        <option value="APPROVED" disabled>Approved (Locked)</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Quick References */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-[#E8DFD3] shadow-sm bg-[#FAF6F0]">
          <CardHeader className="pb-2">
            <h2 className="text-base font-black text-[#2D221E]">Leave & Attendance Request</h2>
          </CardHeader>
          <CardBody className="space-y-3 text-xs font-medium text-[#8C7A6B]">
            <p>Need to apply for a full day, half day, or WFH leave? Submit request to your manager.</p>
            <div className="pt-2">
              <Link href="/dashboard/leave">
                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E8DFD3] bg-white text-[#2D221E] font-bold hover:bg-[#F5EFE6] transition-colors">
                  <FileText className="h-4 w-4 text-[#B87C4C]" />
                  Apply for Leave
                </button>
              </Link>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-[#E8DFD3] shadow-sm bg-white">
          <CardHeader className="pb-2">
            <h2 className="text-base font-black text-[#2D221E]">Daily Guidelines</h2>
          </CardHeader>
          <CardBody className="text-xs text-[#8C7A6B] font-bold space-y-1.5">
            <p>1. Check in when starting work shift.</p>
            <p>2. Click Calendar View to log multiple video/graphic/task deliverables completed today.</p>
            <p>3. Submit EOD summary before checking out.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
