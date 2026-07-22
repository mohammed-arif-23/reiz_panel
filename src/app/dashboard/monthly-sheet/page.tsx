"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import {
  Download,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  Calendar as CalendarIcon,
  ExternalLink
} from "lucide-react";
import * as XLSX from "xlsx";

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

interface GridRow {
  date: string;
  status: string;
  checkIn?: string | null;
  checkOut?: string | null;
  workDuration?: number;
  breakDuration?: number;
  tasksCount?: number;
  eodSummary?: string;
  entries?: WorkEntry[];
}

interface GridUser {
  id: string;
  name: string;
  email: string;
  designation?: string;
  role?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function sanitizeCell(val: unknown): unknown {
  if (val === undefined || val === null) return "";
  const str = String(val);
  if (/^[=+\-@]/.test(str.trim())) return `'${str}`;
  return val;
}

function getStatusCls(status: string): string {
  switch (status) {
    case "PRESENT": return "bg-[#362722] text-[#FAF6F0] border-[#362722]";
    case "WFH": return "bg-blue-100 text-blue-800 border-blue-200";
    case "LEAVE": return "bg-amber-100 text-amber-800 border-amber-200";
    case "HOLIDAY": return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "HALF_DAY": return "bg-orange-100 text-orange-800 border-orange-200";
    case "MISSING_CHECKOUT": return "bg-purple-100 text-purple-800 border-purple-200";
    default: return "bg-[#E8DFD3] text-[#8C7A6B] border-[#E8DFD3]";
  }
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmtDuration(mins: number | undefined): string {
  if (!mins || mins === 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function MonthlySheet() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [rows, setRows] = useState<GridRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [user, setUser] = useState<GridUser | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  const fetchSheetData = useCallback(async () => {
    setLoading(true);
    setError("");
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    try {
      const res = await fetch(`/api/admin/monthly-grid?year=${year}&month=${month}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load monthly deliverables.");
      } else {
        setUser(data.user ?? null);
        setRows(data.rows || []);
      }
    } catch {
      setError("An error occurred while loading monthly deliverables.");
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchSheetData();
  }, [fetchSheetData]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const exportXLSX = () => {
    try {
      const excelRows: any[] = [];
      rows.forEach((row) => {
        if (Array.isArray(row.entries) && row.entries.length > 0) {
          row.entries.forEach((e) => {
            excelRows.push({
              Date: sanitizeCell(row.date),
              Status: sanitizeCell(row.status),
              "Check In": sanitizeCell(fmtTime(row.checkIn)),
              "Check Out": sanitizeCell(fmtTime(row.checkOut)),
              "Work Hours": sanitizeCell(fmtDuration(row.workDuration)),
              "Deliverable / Task": sanitizeCell(e.title),
              Category: sanitizeCell(e.category),
              "Output Link": sanitizeCell(e.link),
              Remarks: sanitizeCell(e.remarks),
              "EOD Summary": sanitizeCell(row.eodSummary),
            });
          });
        } else {
          excelRows.push({
            Date: sanitizeCell(row.date),
            Status: sanitizeCell(row.status),
            "Check In": sanitizeCell(fmtTime(row.checkIn)),
            "Check Out": sanitizeCell(fmtTime(row.checkOut)),
            "Work Hours": sanitizeCell(fmtDuration(row.workDuration)),
            "Deliverable / Task": "—",
            Category: "—",
            "Output Link": "—",
            Remarks: "—",
            "EOD Summary": sanitizeCell(row.eodSummary),
          });
        }
      });

      const ws = XLSX.utils.json_to_sheet(excelRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Monthly Deliverables");

      const monthKey = `${MONTH_NAMES[currentDate.getMonth()]}`;
      const nameSlug = user?.name ? user.name.replace(/\s+/g, "_") : "Employee";
      XLSX.writeFile(wb, `REIZ_Media_Deliverables_${nameSlug}_${monthKey}_${currentDate.getFullYear()}.xlsx`);
      setSuccess("Exported XLSX file successfully.");
    } catch {
      setError("Failed to export XLSX.");
    }
  };

  const handlePrevMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#2D221E] md:text-3xl">
            Monthly Work Deliverables List
          </h1>
          <p className="text-[#8C7A6B] font-bold mt-1 text-xs sm:text-sm">
            {user ? `${user.name} (${user.designation || user.role})` : "Monthly Completed Work Entries"}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
              isOnline
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            }`}
          >
            {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isOnline ? "Online" : "Offline"}
          </div>

          <div className="flex items-center gap-1 bg-[#FAF6F0] border border-[#E8DFD3] rounded-xl p-1 shadow-xs">
            <button onClick={handlePrevMonth} className="p-1.5 rounded-lg text-[#2D221E] hover:bg-[#F5EFE6]">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-[#2D221E] px-3 min-w-[130px] text-center">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button onClick={handleNextMonth} className="p-1.5 rounded-lg text-[#2D221E] hover:bg-[#F5EFE6]">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={exportXLSX}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#362722] px-4 py-2 text-xs font-bold text-[#FAF6F0] hover:bg-[#261A16] disabled:opacity-50 transition-colors shadow-xs"
          >
            <Download className="h-4 w-4 text-[#C68B59]" />
            Export XLSX
          </button>
        </div>
      </div>

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

      {/* Clean Chronological List of Work Entries per Day */}
      <Card className="border border-[#E8DFD3] shadow-sm overflow-hidden bg-[#FAF6F0]">
        <CardHeader className="bg-[#F5EFE6] py-3.5 px-6 border-b border-[#E8DFD3] flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-[#B87C4C]" />
          <span className="font-extrabold text-[#2D221E] text-xs sm:text-sm">
            Monthly Chronological Work Log Feed
          </span>
        </CardHeader>

        <CardBody className="p-0">
          {loading ? (
            <div className="py-16 text-center text-[#8C7A6B] font-bold text-sm">
              Loading monthly deliverables list...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-[#8C7A6B] font-bold text-sm">
              No entries logged for this month yet.
            </div>
          ) : (
            <div className="divide-y divide-[#E8DFD3]">
              {rows.map((row) => {
                const hasEntries = Array.isArray(row.entries) && row.entries.length > 0;

                return (
                  <div key={row.date} className="p-5 bg-white space-y-3 hover:bg-[#FAF6F0]/60 transition-colors">
                    {/* Date Header + Shift Timestamps */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#F5EFE6] pb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-[#2D221E]">{row.date}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${getStatusCls(row.status)}`}>
                          {row.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-bold text-[#8C7A6B]">
                        <span>In: <strong className="text-[#2D221E]">{fmtTime(row.checkIn)}</strong></span>
                        <span>Out: <strong className="text-[#2D221E]">{fmtTime(row.checkOut)}</strong></span>
                        <span>Work Duration: <strong className="text-[#B87C4C]">{fmtDuration(row.workDuration)}</strong></span>
                      </div>
                    </div>

                    {/* Deliverables List */}
                    <div>
                      {!hasEntries ? (
                        <p className="text-xs text-[#8C7A6B]/70 italic">No work entries logged for this date.</p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2 pt-1">
                          {row.entries!.map((entry, idx) => (
                            <div key={entry.id || idx} className="p-3 rounded-xl bg-[#FAF6F0] border border-[#E8DFD3] text-xs space-y-1">
                              <div className="flex items-center justify-between font-extrabold text-[#2D221E]">
                                <span>• {entry.title}</span>
                                <div className="flex items-center gap-1">
                                  {entry.clientName && (
                                    <span className="text-[10px] bg-[#FAF6F0] text-[#B87C4C] border border-[#E8DFD3] px-1.5 py-0.5 rounded font-extrabold">
                                      Client: {entry.clientName}
                                    </span>
                                  )}
                                  <span className="text-[10px] bg-[#362722] text-[#FAF6F0] px-2 py-0.5 rounded">{entry.category}</span>
                                </div>
                              </div>
                              {entry.remarks && <p className="text-[#8C7A6B] text-[11px] font-semibold">{entry.remarks}</p>}
                              {entry.link && (
                                <p className="text-[11px] font-bold text-[#B87C4C] pt-0.5">
                                  File: <span className="text-[#2D221E] font-semibold">{entry.link}</span>
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {row.eodSummary && (
                        <div className="mt-2 text-xs bg-[#F7EBE1]/60 border border-[#E8DFD3] p-2.5 rounded-xl text-[#2D221E]">
                          <span className="font-bold text-[#B87C4C]">EOD Summary: </span>{row.eodSummary}
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
    </div>
  );
}
