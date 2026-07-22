"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Loader2,
  Plus,
  Trash2
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkEntry {
  id: string;
  title: string;
  category: string;
  hoursSpent: string;
  link: string;
  remarks: string;
  clientId?: string;
  clientName?: string;
}

interface DayRecord {
  date: string;
  status: "PRESENT" | "ABSENT" | "LEAVE" | "HOLIDAY" | "WFH" | "HALF_DAY" | "MISSING_CHECKOUT";
  checkIn?: string | null;
  checkOut?: string | null;
  workDuration?: number;
  breakDuration?: number;
  tasksCount?: number;
  eodSummary?: string;
  leaveType?: string;
  note?: string;
  entries?: WorkEntry[];
  data?: Record<string, unknown>;
}

interface GridColumn {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
}

interface CalendarCell extends DayRecord {
  isPadding: boolean;
  dayNum?: number;
  key: string;
}

interface GridUser {
  id: string;
  name: string;
  email: string;
  designation?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const LEGEND: { label: string; cls: string }[] = [
  { label: "Present", cls: "bg-[#F7EBE1] border-[#E8DFD3] text-[#362722]" },
  { label: "Absent", cls: "bg-red-50 border-red-200 text-red-700" },
  { label: "Leave", cls: "bg-amber-50 border-amber-200 text-amber-800" },
  { label: "Holiday", cls: "bg-indigo-50 border-indigo-200 text-indigo-800" },
  { label: "WFH", cls: "bg-blue-50 border-blue-200 text-blue-800" },
  { label: "Half Day", cls: "bg-orange-50 border-orange-200 text-orange-800" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusStyle(status: string): string {
  switch (status) {
    case "PRESENT": return "bg-[#FAF6F0] hover:bg-[#F5EFE6] border-[#E8DFD3] text-[#2D221E]";
    case "WFH": return "bg-blue-50/70 hover:bg-blue-100/70 border-blue-200 text-blue-900";
    case "LEAVE": return "bg-amber-50/70 hover:bg-amber-100/70 border-amber-200 text-amber-900";
    case "HOLIDAY": return "bg-indigo-50/70 hover:bg-indigo-100/70 border-indigo-200 text-indigo-900";
    case "HALF_DAY": return "bg-orange-50/70 hover:bg-orange-100/70 border-orange-200 text-orange-900";
    case "MISSING_CHECKOUT": return "bg-purple-50/70 hover:bg-purple-100/70 border-purple-200 text-purple-900";
    case "ABSENT":
    default: return "bg-red-50/60 hover:bg-red-100/60 border-red-200 text-red-900";
  }
}

function getStatusBadge(status: string): string {
  switch (status) {
    case "PRESENT": return "bg-[#362722] text-[#FAF6F0]";
    case "WFH": return "bg-blue-100 text-blue-800";
    case "LEAVE": return "bg-amber-100 text-amber-800";
    case "HOLIDAY": return "bg-indigo-100 text-indigo-800";
    case "HALF_DAY": return "bg-orange-100 text-orange-800";
    case "MISSING_CHECKOUT": return "bg-purple-100 text-purple-800";
    default: return "bg-red-100 text-red-800";
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarPage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Attendance rows
  const [monthlyData, setMonthlyData] = useState<DayRecord[]>([]);

  // Client list options
  const [clients, setClients] = useState<Array<{ _id: string; name: string; email: string }>>([]);

  // Grid data from monthly-grid
  const [gridColumns, setGridColumns] = useState<GridColumn[]>([]);
  const [gridRows, setGridRows] = useState<DayRecord[]>([]);
  const [gridUser, setGridUser] = useState<GridUser | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<CalendarCell | null>(null);

  // Multiple Work Entries State per day
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([]);
  const [eodValue, setEodValue] = useState("");
  const [saving, setSaving] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // ── Fetch attendance data ──
  const fetchMonthlyData = useCallback(async () => {
    setLoading(true);
    setError("");
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    try {
      const res = await fetch(`/api/attendance?month=${monthStr}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to fetch attendance data.");
        setMonthlyData([]);
      } else {
        const rows: DayRecord[] = Array.isArray(data)
          ? data
          : data.records ?? data.data ?? data.attendance ?? [];
        setMonthlyData(rows);
      }
    } catch {
      setError("An error occurred while loading attendance data.");
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  // ── Fetch monthly-grid data ──
  const fetchGridData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/monthly-grid?year=${year}&month=${month + 1}`);
      const data = await res.json();
      if (res.ok) {
        setGridColumns(data.columns || []);
        setGridRows(data.rows || []);
        setGridUser(data.user || null);
      }
    } catch {
      // Non-critical
    }
  }, [year, month]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchMonthlyData();
    fetchGridData();
    fetchClients();
  }, [fetchMonthlyData, fetchGridData, fetchClients]);

  // Auto-clear alerts
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 5000); return () => clearTimeout(t); }
  }, [success]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(""), 8000); return () => clearTimeout(t); }
  }, [error]);

  // Close modal on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setModalOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── Month navigation ──
  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleGoToToday = () => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));

  // ── Open modal for clicked day ──
  const handleDayClick = (cell: CalendarCell) => {
    if (cell.isPadding) return;
    setSelectedDay(cell);
    setError("");

    const gridRow = gridRows.find((r) => r.date === cell.date);
    
    // Check if multiple entries exist
    let existingEntries: WorkEntry[] = [];
    if (Array.isArray(gridRow?.entries) && gridRow.entries.length > 0) {
      existingEntries = gridRow.entries;
    } else if (gridRow?.data && Object.keys(gridRow.data).length > 0) {
      // Fallback from key-value single column data
      const firstEntry: WorkEntry = {
        id: "entry-1",
        title: (gridRow.data.videoTitle || gridRow.data.title || gridRow.data.taskTitle || "Work Deliverable") as string,
        category: (gridRow.data.designType || gridRow.data.platform || "Deliverable") as string,
        hoursSpent: String(gridRow.data.hoursSpent || "1"),
        link: (gridRow.data.driveLink || gridRow.data.figmaLink || gridRow.data.liveLink || "") as string,
        remarks: (gridRow.data.remarks || gridRow.data.notes || "") as string,
      };
      existingEntries = [firstEntry];
    } else {
      // Default initial 1 empty row
      existingEntries = [
        { id: `entry-${Date.now()}-1`, title: "", category: "Video Editing", hoursSpent: "1", link: "", remarks: "", clientId: "", clientName: "" },
      ];
    }

    setWorkEntries(existingEntries);
    setEodValue(gridRow?.eodSummary ?? cell.eodSummary ?? "");
    setModalOpen(true);
  };

  // ── Add new work entry ──
  const handleAddWorkEntry = () => {
    setWorkEntries((prev) => [
      ...prev,
      { id: `entry-${Date.now()}-${prev.length + 1}`, title: "", category: "General Work", hoursSpent: "1", link: "", remarks: "", clientId: "", clientName: "" },
    ]);
  };

  // ── Remove work entry ──
  const handleRemoveWorkEntry = (id: string) => {
    setWorkEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));
  };

  // ── Update individual entry field ──
  const handleUpdateWorkEntry = (id: string, field: keyof WorkEntry, value: string) => {
    setWorkEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  // ── Save multiple work entries ──
  const handleSave = async () => {
    if (!selectedDay || !gridUser) return;
    setSaving(true);

    let hasError = false;

    // Filter out completely empty entries
    const validEntries = workEntries.filter((e) => e.title.trim() !== "" || e.remarks.trim() !== "");

    try {
      const res = await fetch("/api/tasks/cell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: gridUser.id,
          date: selectedDay.date,
          entries: validEntries,
        }),
      });
      if (!res.ok) hasError = true;
    } catch {
      hasError = true;
    }

    // Save EOD summary
    try {
      const eodRes = await fetch("/api/tasks/eod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDay.date, eodSummary: eodValue }),
      });
      if (!eodRes.ok) hasError = true;
    } catch {
      hasError = true;
    }

    setSaving(false);

    if (hasError) {
      setError("Failed to save entries. Please try again.");
    } else {
      setSuccess("Work entries saved successfully!");
      setModalOpen(false);
      await Promise.all([fetchMonthlyData(), fetchGridData()]);
    }
  };

  // ── Build calendar cells ──
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const dataMap = new Map(monthlyData.map((d) => [d.date, d]));
  const gridMap = new Map(gridRows.map((r) => [r.date, r]));

  const cells: CalendarCell[] = [];

  for (let i = 0; i < firstDayIndex; i++) {
    cells.push({ isPadding: true, key: `pad-prev-${i}`, date: "", status: "ABSENT" });
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  for (let d = 1; d <= totalDays; d++) {
    const dayStr = String(d).padStart(2, "0");
    const monthPad = String(month + 1).padStart(2, "0");
    const dateStr = `${year}-${monthPad}-${dayStr}`;
    const rec = dataMap.get(dateStr);
    const gridRec = gridMap.get(dateStr);

    const dayOfWeek = new Date(year, month, d).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const defaultStatus: DayRecord["status"] =
      new Date(dateStr) > today ? "ABSENT" : isWeekend ? "HOLIDAY" : "ABSENT";

    const entriesCount = Array.isArray(gridRec?.entries) ? gridRec.entries.length : (rec?.tasksCount ?? 0);

    cells.push({
      isPadding: false,
      dayNum: d,
      date: dateStr,
      status: rec?.status ?? defaultStatus,
      checkIn: rec?.checkIn ?? null,
      checkOut: rec?.checkOut ?? null,
      workDuration: rec?.workDuration ?? 0,
      breakDuration: rec?.breakDuration ?? 0,
      tasksCount: entriesCount,
      eodSummary: rec?.eodSummary ?? "",
      leaveType: rec?.leaveType,
      note: rec?.note,
      key: `day-${d}`,
    });
  }

  const paddingEnd = 42 - cells.length;
  for (let i = 0; i < paddingEnd; i++) {
    cells.push({ isPadding: true, key: `pad-next-${i}`, date: "", status: "ABSENT" });
  }

  const isCurrentViewingMonth = year === today.getFullYear() && month === today.getMonth();

  // Summary stats
  const presentCount = monthlyData.filter((d) => d.status === "PRESENT" || d.status === "WFH").length;
  const absentCount = monthlyData.filter((d) => d.status === "ABSENT" || d.status === "MISSING_CHECKOUT").length;
  const leaveCount = monthlyData.filter((d) => d.status === "LEAVE" || d.status === "HALF_DAY").length;
  const holidayCount = monthlyData.filter((d) => d.status === "HOLIDAY").length;

  const selectedDayLabel = selectedDay?.date
    ? new Date(selectedDay.date + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      })
    : "";

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2D221E] md:text-3xl">
            Attendance & Work Logs
          </h1>
          <p className="text-[#8C7A6B] font-medium mt-1 text-sm">
            Select any date to log multiple completed deliverables for REIZ Media.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!isCurrentViewingMonth && (
            <Button variant="outline" onClick={handleGoToToday} className="px-3 py-1.5 h-9 text-xs border-[#E8DFD3] text-[#2D221E]">
              Today
            </Button>
          )}
          <div className="flex items-center gap-1 bg-[#FAF6F0] border border-[#E8DFD3] rounded-xl p-1 shadow-sm">
            <Button variant="light" onClick={handlePrevMonth} className="px-2 py-1.5 h-8 text-[#2D221E]" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-bold text-[#2D221E] px-3 min-w-[130px] text-center">
              {MONTH_NAMES[month]} {year}
            </span>
            <Button variant="light" onClick={handleNextMonth} className="px-2 py-1.5 h-8 text-[#2D221E]" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Alerts ── */}
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

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Present / WFH", value: presentCount, cls: "text-[#362722]", bg: "bg-[#F7EBE1] border-[#E8DFD3]" },
          { label: "Absent", value: absentCount, cls: "text-red-700", bg: "bg-red-50 border-red-200" },
          { label: "On Leave", value: leaveCount, cls: "text-amber-800", bg: "bg-amber-50 border-amber-200" },
          { label: "Holidays", value: holidayCount, cls: "text-indigo-800", bg: "bg-indigo-50 border-indigo-200" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-3.5 ${s.bg} flex flex-col gap-0.5`}>
            <span className={`text-2xl font-extrabold ${s.cls}`}>{s.value}</span>
            <span className="text-xs font-bold text-[#8C7A6B]">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Calendar Grid ── */}
      <Card className="border border-[#E8DFD3] shadow-sm overflow-hidden bg-[#FAF6F0]">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[#E8DFD3] bg-[#F5EFE6]">
          {DAY_LABELS.map((d) => (
            <div key={d} className="py-3 text-center text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        <CardBody className="p-0">
          {loading ? (
            <div className="flex h-96 items-center justify-center">
              <div className="flex items-center gap-2 text-[#8C7A6B] font-semibold">
                <Loader2 className="animate-spin h-5 w-5 text-[#B87C4C]" />
                <span>Loading calendar…</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-7 divide-x divide-y divide-[#E8DFD3]">
              {cells.map((cell) => {
                if (cell.isPadding) {
                  return <div key={cell.key} className="h-24 sm:h-28 bg-[#F5EFE6]/40 p-2" />;
                }

                const isToday = cell.date === todayStr;
                const statusStyle = getStatusStyle(cell.status);

                return (
                  <div
                    key={cell.key}
                    onClick={() => handleDayClick(cell)}
                    className={`h-24 sm:h-28 p-2 flex flex-col justify-between cursor-pointer transition-colors ${statusStyle} ${
                      isToday ? "ring-2 ring-inset ring-[#362722]" : ""
                    }`}
                    title={`${cell.date} — ${cell.status.replace(/_/g, " ")}`}
                  >
                    <div className="flex justify-between items-start">
                      <span
                        className={`text-sm font-bold leading-none ${
                          isToday
                            ? "h-6 w-6 rounded-full bg-[#362722] text-[#FAF6F0] flex items-center justify-center text-xs"
                            : "text-[#2D221E]"
                        }`}
                      >
                        {cell.dayNum}
                      </span>
                      <span className="text-[9px] uppercase tracking-wide font-bold opacity-80 leading-tight text-right">
                        {cell.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="space-y-1 text-left">
                      {cell.checkIn && (
                        <div className="text-[10px] font-semibold text-current opacity-80">
                          ↑ {formatTime(cell.checkIn)}
                        </div>
                      )}
                      {(cell.tasksCount ?? 0) > 0 && (
                        <div className="text-[9px] font-bold bg-[#362722] text-[#FAF6F0] rounded px-1.5 py-0.5 inline-block shadow-xs">
                          {cell.tasksCount} work entries
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-2">
        {LEGEND.map((l) => (
          <span
            key={l.label}
            className={`inline-flex items-center gap-1.5 border rounded-lg px-2.5 py-1 text-xs font-semibold ${l.cls}`}
          >
            <span className="h-2 w-2 rounded-full bg-current opacity-60" />
            {l.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 border-2 border-[#362722] rounded-lg px-2.5 py-1 text-xs font-bold text-[#2D221E]">
          <span className="h-2 w-2 rounded-full bg-[#362722]" />
          Today
        </span>
      </div>

      {/* ── Beautiful Work Log Modal ── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#2D221E]/40 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />

          {/* Modal Card */}
          <div className="relative z-10 w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#FAF6F0] rounded-2xl shadow-2xl border border-[#E8DFD3] overflow-hidden">

            {/* ── Modal Header ── */}
            <div className="flex items-start justify-between px-5 sm:px-6 py-4 border-b border-[#E8DFD3] bg-[#F5EFE6]">
              <div className="flex flex-col gap-0.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#B87C4C]">
                  REIZ Media Deliverables
                </p>
                <h2 className="text-lg sm:text-xl font-black text-[#2D221E] leading-tight">
                  {selectedDayLabel}
                </h2>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {selectedDay && (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(selectedDay.status)}`}>
                    {selectedDay.status.replace(/_/g, " ")}
                  </span>
                )}
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-lg text-[#8C7A6B] hover:text-[#2D221E] hover:bg-[#E8DFD3] transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* ── Attendance Strip ── */}
            {selectedDay && (
              <div className="grid grid-cols-3 divide-x divide-[#E8DFD3] bg-[#FAF6F0] border-b border-[#E8DFD3]">
                {[
                  { label: "Check In", value: selectedDay.checkIn ? formatTime(selectedDay.checkIn) : "—" },
                  { label: "Check Out", value: selectedDay.checkOut ? formatTime(selectedDay.checkOut) : "—" },
                  { label: "Work Hours", value: (selectedDay.workDuration ?? 0) > 0 ? formatDuration(selectedDay.workDuration!) : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col items-center py-2.5 px-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#8C7A6B] mb-0.5">{label}</span>
                    <span className="text-xs sm:text-sm font-bold text-[#2D221E]">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Scrollable Body: Multiple Work Entries ── */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#2D221E]">Work Completed Entries</h3>
                  <p className="text-xs text-[#8C7A6B] font-medium">Add all tasks & deliverables finished on this day.</p>
                </div>
                <button
                  onClick={handleAddWorkEntry}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#362722] text-[#FAF6F0] text-xs font-bold hover:bg-[#261A16] transition-colors shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5 text-[#C68B59]" />
                  Add Work Entry
                </button>
              </div>

              {/* Work Entry Cards / Table */}
              <div className="space-y-3">
                {workEntries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-xl bg-white border border-[#E8DFD3] shadow-xs space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between border-b border-[#F5EFE6] pb-2">
                      <span className="text-xs font-black text-[#B87C4C] uppercase tracking-wider">
                        Work Entry #{index + 1}
                      </span>
                      {workEntries.length > 1 && (
                        <button
                          onClick={() => handleRemoveWorkEntry(entry.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Remove entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">
                          Mapped Client
                        </label>
                        <select
                          value={entry.clientId || ""}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const clientObj = clients.find((c) => c._id === selectedId);
                            setWorkEntries((prev) =>
                              prev.map((item) =>
                                item.id === entry.id
                                  ? { ...item, clientId: selectedId, clientName: clientObj?.name || "" }
                                  : item
                              )
                            );
                          }}
                          className="w-full rounded-lg border border-[#E8DFD3] bg-[#FAF6F0] px-3 py-2 text-xs font-bold text-[#2D221E] focus:outline-none focus:ring-2 focus:ring-[#362722]"
                        >
                          <option value="">— Internal / General —</option>
                          {clients.map((c) => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">
                          Deliverable Title / Task *
                        </label>
                        <input
                          type="text"
                          value={entry.title}
                          onChange={(e) => handleUpdateWorkEntry(entry.id, "title", e.target.value)}
                          placeholder="e.g. MAY VR 8 Reel Video Edit"
                          className="w-full rounded-lg border border-[#E8DFD3] bg-[#FAF6F0] px-3 py-2 text-xs font-bold text-[#2D221E] focus:outline-none focus:ring-2 focus:ring-[#362722]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">
                          Category / Type
                        </label>
                        <select
                          value={entry.category}
                          onChange={(e) => handleUpdateWorkEntry(entry.id, "category", e.target.value)}
                          className="w-full rounded-lg border border-[#E8DFD3] bg-[#FAF6F0] px-3 py-2 text-xs font-bold text-[#2D221E] focus:outline-none focus:ring-2 focus:ring-[#362722]"
                        >
                          <option value="Video Editing">Video Editing</option>
                          <option value="Graphic Design">Graphic Design</option>
                          <option value="Social Media">Social Media</option>
                          <option value="Sales & Outreach">Sales & Outreach</option>
                          <option value="Client Meeting">Client Meeting</option>
                          <option value="General">General</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">
                          Video / File Name
                        </label>
                        <input
                          type="text"
                          value={entry.link}
                          onChange={(e) => handleUpdateWorkEntry(entry.id, "link", e.target.value)}
                          placeholder="e.g. MAY_VR_8_Final_v2.mp4"
                          className="w-full rounded-lg border border-[#E8DFD3] bg-[#FAF6F0] px-3 py-2 text-xs font-medium text-[#2D221E] focus:outline-none focus:ring-2 focus:ring-[#362722]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-[#8C7A6B] uppercase tracking-wider mb-1">
                          Remarks / Notes
                        </label>
                        <input
                          type="text"
                          value={entry.remarks}
                          onChange={(e) => handleUpdateWorkEntry(entry.id, "remarks", e.target.value)}
                          placeholder="e.g. Approved by Manager"
                          className="w-full rounded-lg border border-[#E8DFD3] bg-[#FAF6F0] px-3 py-2 text-xs font-medium text-[#2D221E] focus:outline-none focus:ring-2 focus:ring-[#362722]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* EOD Summary */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider mb-1.5">
                  End of Day Summary Remarks
                </label>
                <textarea
                  value={eodValue}
                  onChange={(e) => setEodValue(e.target.value)}
                  rows={3}
                  placeholder="Summary of daily accomplishments for REIZ Media team..."
                  className="w-full rounded-xl border border-[#E8DFD3] bg-white px-3.5 py-2.5 text-xs font-medium text-[#2D221E] placeholder-[#8C7A6B]/50 focus:outline-none focus:ring-2 focus:ring-[#362722] resize-none"
                />
              </div>
            </div>

            {/* ── Modal Footer ── */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t border-[#E8DFD3] bg-[#F5EFE6]">
              <button
                onClick={handleAddWorkEntry}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B87C4C] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Another Work Entry
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8DFD3] text-xs font-bold text-[#8C7A6B] hover:bg-white transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#362722] text-[#FAF6F0] text-xs font-bold hover:bg-[#261A16] disabled:opacity-50 transition-colors shadow-xs"
                >
                  {saving ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin text-[#C68B59]" /> Saving…</>
                  ) : (
                    <><Save className="h-3.5 w-3.5 text-[#C68B59]" /> Save Daily Entries</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
