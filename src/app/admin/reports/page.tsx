"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Download, FileText, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportMetrics {
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  wfhDays: number;
  totalWorkHours: number;
  overtimeHours: number;
  totalBreakHours: number;
  totalTasks: number;
  completedTasks: number;
  approvedTasks: number;
  taskCompletionRate: number;
}

interface EmployeeReport {
  userId: string;
  name: string;
  email: string;
  designation: string;
  metrics: ReportMetrics;
}

interface Employee {
  _id: string;
  name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function sanitizeCell(val: unknown): unknown {
  if (val === undefined || val === null) return "";
  const str = String(val);
  return /^[=+\-@]/.test(str) ? `'${str}` : val;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-zinc-500"
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

function CompletionBadge({ rate }: { rate: number }) {
  const cls =
    rate >= 80
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : rate >= 50
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-red-50 text-red-700 border-red-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border ${cls}`}>
      {rate}%
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [employees,    setEmployees]    = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [year,         setYear]         = useState(currentYear.toString());
  const [month,        setMonth]        = useState(currentMonth.toString());
  const [reports,      setReports]      = useState<EmployeeReport[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  // ── Fetch employees for filter dropdown ──
  useEffect(() => {
    fetch("/api/admin/employees")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setEmployees(d.users || []))
      .catch(console.error);
  }, []);

  // ── Fetch report data ──
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    let url = `/api/admin/reports?year=${year}&month=${month}`;
    if (selectedEmpId) url += `&userId=${selectedEmpId}`;
    try {
      const res  = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load reports.");
        setReports([]);
      } else {
        setReports(data.reports || []);
      }
    } catch {
      setError("An error occurred while loading report statistics.");
    } finally {
      setLoading(false);
    }
  }, [year, month, selectedEmpId]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── XLSX Export ──
  const handleExportXLSX = () => {
    if (reports.length === 0) return;
    setExportLoading(true);
    setSuccess("");
    setError("");
    try {
      const headers = [
        "Employee Name","Email","Designation",
        "Present Days","Absent Days","Leave Days","WFH Days",
        "Total Work Hours","Overtime Hours","Break Hours",
        "Total Assigned Tasks","Completed Tasks","Approved Tasks",
        "Task Completion Rate (%)",
      ];
      const rows = reports.map((r) => ({
        "Employee Name":          sanitizeCell(r.name),
        "Email":                  sanitizeCell(r.email),
        "Designation":            sanitizeCell(r.designation),
        "Present Days":           r.metrics.presentDays,
        "Absent Days":            r.metrics.absentDays,
        "Leave Days":             r.metrics.leaveDays,
        "WFH Days":               r.metrics.wfhDays,
        "Total Work Hours":       r.metrics.totalWorkHours,
        "Overtime Hours":         r.metrics.overtimeHours,
        "Break Hours":            r.metrics.totalBreakHours,
        "Total Assigned Tasks":   r.metrics.totalTasks,
        "Completed Tasks":        r.metrics.completedTasks,
        "Approved Tasks":         r.metrics.approvedTasks,
        "Task Completion Rate (%)": r.metrics.taskCompletionRate,
      }));
      const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Monthly Productivity Report");
      XLSX.writeFile(wb, `REIZ_Pulse_Report_${MONTH_SHORT[parseInt(month) - 1]}_${year}.xlsx`);
      setSuccess("XLSX report exported successfully!");
    } catch {
      setError("Failed to export XLSX report.");
    } finally {
      setExportLoading(false);
    }
  };

  // ── CSV Export ──
  const handleExportCSV = () => {
    if (reports.length === 0) return;
    setSuccess("");
    setError("");
    try {
      const headers = [
        "Employee Name","Email","Designation",
        "Present Days","Absent Days","Leave Days","WFH Days",
        "Total Work Hours","Overtime Hours","Break Hours",
        "Total Assigned Tasks","Completed Tasks","Approved Tasks",
        "Task Completion Rate (%)",
      ];
      const escape = (v: unknown) => {
        const s = String(v ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const lines = [
        headers.join(","),
        ...reports.map((r) =>
          [
            r.name, r.email, r.designation,
            r.metrics.presentDays, r.metrics.absentDays, r.metrics.leaveDays, r.metrics.wfhDays,
            r.metrics.totalWorkHours, r.metrics.overtimeHours, r.metrics.totalBreakHours,
            r.metrics.totalTasks, r.metrics.completedTasks, r.metrics.approvedTasks,
            r.metrics.taskCompletionRate,
          ].map(escape).join(",")
        ),
      ];
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `REIZ_Pulse_Report_${MONTH_SHORT[parseInt(month) - 1]}_${year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess("CSV report exported successfully!");
    } catch {
      setError("Failed to export CSV report.");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">
            Work Reports &amp; Overtime
          </h1>
          <p className="text-sm text-zinc-500 font-medium mt-1">
            Analyze employee working hours, overtime details, and task completion metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            disabled={reports.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:border-zinc-400 transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <FileText className="h-4 w-4" />
            CSV
          </button>

          {/* XLSX Export */}
          <button
            onClick={handleExportXLSX}
            disabled={exportLoading || reports.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {exportLoading ? <Spinner /> : <FileSpreadsheet className="h-4 w-4" />}
            Export XLSX
          </button>
        </div>
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

      {/* ── Filter Controls ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Year */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-700">Year</label>
            <div className="relative">
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-xl text-sm font-medium text-zinc-800 border border-zinc-200 bg-white hover:border-zinc-400 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 outline-none appearance-none cursor-pointer pl-4 pr-10 py-2.5 h-11 transition-all duration-200"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-zinc-400">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>

          {/* Month */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-700">Month</label>
            <div className="relative">
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full rounded-xl text-sm font-medium text-zinc-800 border border-zinc-200 bg-white hover:border-zinc-400 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 outline-none appearance-none cursor-pointer pl-4 pr-10 py-2.5 h-11 transition-all duration-200"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={(i + 1).toString()}>{name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-zinc-400">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>

          {/* Employee */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-700">Filter by Employee</label>
            <div className="relative">
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full rounded-xl text-sm font-medium text-zinc-800 border border-zinc-200 bg-white hover:border-zinc-400 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 outline-none appearance-none cursor-pointer pl-4 pr-10 py-2.5 h-11 transition-all duration-200"
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>{emp.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-zinc-400">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Data Table ── */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-100 bg-zinc-50">
          <FileText className="h-5 w-5 text-zinc-400" />
          <h2 className="text-base font-bold text-zinc-900">Monthly Performance Metrics</h2>
          {!loading && (
            <span className="ml-auto text-xs font-semibold text-zinc-400">
              {reports.length} employee{reports.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Card body */}
        {loading ? (
          <div className="flex h-64 items-center justify-center gap-3 text-sm font-semibold text-zinc-500">
            <Spinner />
            <span>Loading report statistics…</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
            <FileText className="h-10 w-10 opacity-40" />
            <p className="text-sm font-semibold">No reports available for the selected period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wide">Employee</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wide text-center">Attendance (P/A/L/W)</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wide text-center">Work Hrs</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wide text-center">Break Hrs</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wide text-center">Overtime</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wide text-center">Tasks (Done/Total)</th>
                  <th className="py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wide text-right">Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {reports.map((report) => (
                  <tr key={report.userId} className="hover:bg-zinc-50/60 transition-colors">
                    {/* Employee info */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-900">{report.name}</div>
                      <div className="text-xs text-zinc-400 font-medium mt-0.5">
                        {report.email}
                        {report.designation && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-zinc-400 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded-md">
                            {report.designation}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Attendance breakdown */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-emerald-700">{report.metrics.presentDays}d</span>
                      <span className="text-zinc-300 mx-1">/</span>
                      <span className="font-bold text-red-600">{report.metrics.absentDays}d</span>
                      <span className="text-zinc-300 mx-1">/</span>
                      <span className="font-bold text-amber-600">{report.metrics.leaveDays}d</span>
                      <span className="text-zinc-300 mx-1">/</span>
                      <span className="font-bold text-blue-600">{report.metrics.wfhDays}d</span>
                    </td>

                    {/* Work hours */}
                    <td className="py-3.5 px-4 text-center font-bold text-zinc-800">
                      {report.metrics.totalWorkHours}h
                    </td>

                    {/* Break hours */}
                    <td className="py-3.5 px-4 text-center font-semibold text-zinc-500">
                      {report.metrics.totalBreakHours}h
                    </td>

                    {/* Overtime */}
                    <td className="py-3.5 px-4 text-center">
                      {report.metrics.overtimeHours > 0 ? (
                        <span className="inline-flex items-center gap-1 font-extrabold text-indigo-700">
                          +{report.metrics.overtimeHours}h
                        </span>
                      ) : (
                        <span className="text-zinc-400 font-semibold">—</span>
                      )}
                    </td>

                    {/* Tasks */}
                    <td className="py-3.5 px-4 text-center font-semibold text-zinc-600">
                      {report.metrics.completedTasks + report.metrics.approvedTasks}
                      <span className="text-zinc-300 mx-1">/</span>
                      {report.metrics.totalTasks}
                    </td>

                    {/* Completion rate badge */}
                    <td className="py-3.5 px-4 text-right">
                      <CompletionBadge rate={report.metrics.taskCompletionRate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
