"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CalendarDays, Plus, Trash2, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface Holiday {
  _id: string;
  name: string;
  date: string;
  isOptional: boolean;
}

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", date: "", isOptional: false });

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/holidays");
      const data = await res.json();
      if (res.ok) setHolidays(data.holidays || []);
      else setError(data.error || "Failed to load holidays.");
    } catch {
      setError("Failed to load holidays.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 4000); return () => clearTimeout(t); }
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.date) { setError("Name and date are required."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Holiday added successfully.");
        setShowForm(false);
        setForm({ name: "", date: "", isOptional: false });
        fetchHolidays();
      } else {
        setError(data.error || "Failed to create holiday.");
      }
    } catch {
      setError("An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete holiday "${name}"?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/holidays/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess("Holiday deleted.");
        setHolidays((prev) => prev.filter((h) => h._id !== id));
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete.");
      }
    } catch {
      setError("Failed to delete.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">
            Holiday Management
          </h1>
          <p className="text-zinc-500 font-medium mt-1">
            Manage public and company holidays for the attendance calendar.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(""); }}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Holiday
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Add Holiday Form */}
      {showForm && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-zinc-900 mb-5">Add New Holiday</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Holiday Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Republic Day"
                  className="rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm font-medium text-zinc-900 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Date *
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  className="rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="isOptional"
                checked={form.isOptional}
                onChange={(e) => setForm((p) => ({ ...p, isOptional: e.target.checked }))}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-900"
              />
              <label htmlFor="isOptional" className="text-sm font-semibold text-zinc-700">
                Optional holiday (employees may choose to work)
              </label>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Add Holiday"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(""); setForm({ name: "", date: "", isOptional: false }); }}
                className="rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Holidays Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="flex items-center gap-2 text-zinc-500 font-semibold">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading holidays…
            </div>
          </div>
        ) : holidays.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-400">
            <CalendarDays className="h-10 w-10" />
            <div className="text-center">
              <p className="font-bold text-zinc-600">No holidays added yet</p>
              <p className="text-sm mt-1">Click &quot;Add Holiday&quot; to add the first one.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3.5 text-right text-xs font-bold text-zinc-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {holidays.map((h) => (
                  <tr key={h._id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-zinc-900">{h.name}</td>
                    <td className="px-5 py-4 text-zinc-600 font-medium">{formatDate(h.date)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                        h.isOptional
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      }`}>
                        {h.isOptional ? "Optional" : "Public Holiday"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleDelete(h._id, h.name)}
                        disabled={deletingId === h._id}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all disabled:opacity-50"
                      >
                        {deletingId === h._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {!loading && holidays.length > 0 && (
        <p className="text-xs text-zinc-400 font-semibold text-right">
          {holidays.length} holiday{holidays.length !== 1 ? "s" : ""} total
          · {holidays.filter((h) => !h.isOptional).length} public
          · {holidays.filter((h) => h.isOptional).length} optional
        </p>
      )}
    </div>
  );
}
