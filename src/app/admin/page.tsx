"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import {
  Users,
  Clock,
  Coffee,
  AlertTriangle,
  UserCheck,
  UserX,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from "lucide-react";

interface PersonOverview {
  userId: string;
  name: string;
  email: string;
  designation: string;
  sessionStatus: "ACTIVE_WORKING" | "ON_BREAK" | "CHECKED_OUT" | "LEAVE" | "ABSENT";
  checkIn: string | null;
  checkOut: string | null;
  workDurationMinutes: number;
  breakDurationMinutes: number;
  entries: Array<{
    id: string;
    title: string;
    category: string;
    hoursSpent: string;
    link: string;
    remarks: string;
    clientId?: string;
    clientName?: string;
  }>;
  eodSummary: string;
}

export default function AdminOverview() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/overview?date=${selectedDate}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to load admin overview statistics.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while loading overview statistics.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 30000);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const formatDuration = (mins: number) => {
    if (!mins) return "—";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const summary = data?.summary || {
    totalEmployees: 0,
    checkedInNow: 0,
    onBreakNow: 0,
    checkedOutToday: 0,
    notCheckedInToday: 0,
    pendingLeaves: 0,
    pendingCorrections: 0,
  };

  const statCards = [
    { title: "Active Team", value: summary.totalEmployees, icon: Users, color: "bg-[#F7EBE1] text-[#362722] border-[#E8DFD3]" },
    { title: "Checked In", value: summary.checkedInNow, icon: UserCheck, color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    { title: "On Break", value: summary.onBreakNow, icon: Coffee, color: "bg-amber-50 text-amber-800 border-amber-200" },
    { title: "Shift Completed", value: summary.checkedOutToday, icon: Clock, color: "bg-blue-50 text-blue-800 border-blue-200" },
    { title: "Not Checked In", value: summary.notCheckedInToday, icon: UserX, color: "bg-red-50 text-red-800 border-red-200" },
    { title: "Pending Approvals", value: summary.pendingLeaves + summary.pendingCorrections, icon: FileSpreadsheet, color: "bg-[#F7EBE1] text-[#B87C4C] border-[#E8DFD3]" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Top Header & Date Navigation ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#2D221E] md:text-3xl">Admin Overview</h1>
          <p className="text-[#8C7A6B] font-bold mt-1 text-xs sm:text-sm">
            Per-Person Shift Attendance Logs & Work Deliverables Feed
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-xl border border-[#E8DFD3] bg-white text-xs font-bold text-[#2D221E] hover:bg-[#F5EFE6]"
          >
            Today
          </button>
          <div className="flex items-center gap-1 bg-[#FAF6F0] border border-[#E8DFD3] rounded-xl p-1 shadow-xs">
            <button onClick={handlePrevDay} className="p-1.5 rounded-lg text-[#2D221E] hover:bg-[#F5EFE6]">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold text-[#2D221E] bg-transparent px-2 py-1 focus:outline-none"
            />
            <button onClick={handleNextDay} className="p-1.5 rounded-lg text-[#2D221E] hover:bg-[#F5EFE6]">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <Alert color="danger" startContent={<AlertCircle className="h-5 w-5" />}>
          {error}
        </Alert>
      )}

      {/* Counters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="border border-[#E8DFD3] shadow-xs bg-[#FAF6F0]">
              <CardBody className="flex flex-row items-center gap-4 p-4">
                <div className={`p-3 rounded-xl border ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] text-[#8C7A6B] font-bold uppercase tracking-wider">{card.title}</p>
                  <p className="text-2xl font-black text-[#2D221E] mt-0.5">{card.value}</p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* ── Per Person Work & Attendance Feed ── */}
      <Card className="border border-[#E8DFD3] shadow-sm overflow-hidden bg-[#FAF6F0]">
        <CardHeader className="bg-[#F5EFE6] border-b border-[#E8DFD3] py-3.5 px-6 flex items-center justify-between">
          <h2 className="text-base font-black text-[#2D221E] flex items-center gap-2">
            <Users className="h-5 w-5 text-[#B87C4C]" />
            <span>Per-Person Shift Logs & Work Entries ({selectedDate})</span>
          </h2>
          {loading && <Loader2 className="animate-spin h-4 w-4 text-[#B87C4C]" />}
        </CardHeader>

        <CardBody className="p-0">
          {!data?.perPersonOverview || data.perPersonOverview.length === 0 ? (
            <div className="text-center py-16 text-[#8C7A6B] font-bold text-sm">
              No employee data found for {selectedDate}.
            </div>
          ) : (
            <div className="divide-y divide-[#E8DFD3]">
              {data.perPersonOverview.map((person: PersonOverview) => (
                <div key={person.userId} className="p-5 bg-white space-y-4 hover:bg-[#FAF6F0]/60 transition-colors">
                  {/* Row Top: Person Info + Status + Timestamps */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#F5EFE6] pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#362722] text-[#FAF6F0] flex items-center justify-center font-extrabold text-sm">
                        {person.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-[#2D221E] text-sm sm:text-base">{person.name}</h3>
                        <p className="text-xs text-[#8C7A6B] font-semibold">{person.designation} · {person.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-bold">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        person.sessionStatus === "ACTIVE_WORKING" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                        person.sessionStatus === "ON_BREAK" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                        person.sessionStatus === "CHECKED_OUT" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                        person.sessionStatus === "LEAVE" ? "bg-purple-100 text-purple-800 border border-purple-200" :
                        "bg-[#E8DFD3] text-[#8C7A6B]"
                      }`}>
                        {person.sessionStatus.replace(/_/g, " ")}
                      </span>

                      <div className="flex items-center gap-3 bg-[#FAF6F0] border border-[#E8DFD3] px-3 py-1.5 rounded-xl">
                        <div>In: <span className="text-[#2D221E]">{formatTime(person.checkIn)}</span></div>
                        <div>Out: <span className="text-[#2D221E]">{formatTime(person.checkOut)}</span></div>
                        <div>Hours: <span className="text-[#B87C4C]">{formatDuration(person.workDurationMinutes)}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Row Bottom: Deliverables / Work Completed List */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C7A6B] mb-2">
                      Work Completed Deliverables ({person.entries.length} items logged)
                    </h4>

                    {person.entries.length === 0 ? (
                      <p className="text-xs text-[#8C7A6B]/70 italic">No work entries logged for this date yet.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {person.entries.map((entry, idx) => (
                          <div key={entry.id || idx} className="p-3 rounded-xl bg-[#FAF6F0] border border-[#E8DFD3] text-xs space-y-1">
                            <div className="flex items-center justify-between font-bold text-[#2D221E]">
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
                            {entry.remarks && <p className="text-[#8C7A6B] text-[11px] font-medium">{entry.remarks}</p>}
                            {entry.link && (
                              <p className="text-[11px] font-bold text-[#B87C4C] pt-0.5">
                                File: <span className="text-[#2D221E] font-medium">{entry.link}</span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {person.eodSummary && (
                      <div className="mt-2 text-xs bg-[#F7EBE1]/60 border border-[#E8DFD3] p-2.5 rounded-xl text-[#2D221E]">
                        <span className="font-bold text-[#B87C4C]">EOD Summary: </span>{person.eodSummary}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
