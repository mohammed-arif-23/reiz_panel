"use client";

import React, { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { History, Shield, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

export default function AuditLogsViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [limit] = useState(50);
  const [skip, setSkip] = useState(0);

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/audit-logs?limit=${limit}&skip=${skip}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to load audit logs.");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred while loading audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [skip]);

  const handlePrevPage = () => {
    setSkip(Math.max(0, skip - limit));
  };

  const handleNextPage = () => {
    if (skip + limit < total) {
      setSkip(skip + limit);
    }
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-zinc-550 font-semibold flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading security audit log...</span>
        </div>
      </div>
    );
  }

  const currentPageNum = Math.floor(skip / limit) + 1;
  const totalPagesNum = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">Immutable Audit Logs</h1>
          <p className="text-zinc-550 font-medium mt-1">
            System activity registers for compliance and administrative safety reviews
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl p-1 shadow-sm">
          <Button variant="light" onClick={handlePrevPage} disabled={skip === 0} className="px-2 py-1 h-7 min-h-7">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-bold text-zinc-800 px-2.5">
            Page {currentPageNum} of {totalPagesNum} ({total} logs)
          </span>
          <Button variant="light" onClick={handleNextPage} disabled={skip + limit >= total} className="px-2 py-1 h-7 min-h-7">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <Alert color="danger" startContent={<AlertCircle className="h-5 w-5" />}>
          {error}
        </Alert>
      )}

      {/* Audit Log Table */}
      <Card className="border border-zinc-200 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-zinc-50 border-b border-zinc-200 py-3.5 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-zinc-500" />
            <span className="font-bold text-zinc-850 text-sm">Security Ledger</span>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-zinc-400 font-bold uppercase tracking-wider">
            <Shield className="h-3.5 w-3.5" /> Immutable Log
          </span>
        </CardHeader>
        <CardBody className="p-0">
          {logs.length === 0 ? (
            <div className="text-center py-16 text-zinc-450 font-semibold">
              No audit logs recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold text-zinc-655">Timestamp</th>
                    <th className="py-3 px-4 font-semibold text-zinc-650">Operator</th>
                    <th className="py-3 px-4 font-semibold text-zinc-655">Action Type</th>
                    <th className="py-3 px-4 font-semibold text-zinc-655">Log Details</th>
                    <th className="py-3 px-4 font-semibold text-zinc-650">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-150">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-zinc-50/50 transition-colors text-xs">
                      <td className="py-3.5 px-4 font-semibold text-zinc-650 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        {log.userId ? (
                          <>
                            <div className="font-bold text-zinc-800">{log.userId.name}</div>
                            <div className="text-[10px] text-zinc-400 font-semibold">{log.userId.email} | {log.userId.role}</div>
                          </>
                        ) : (
                          <span className="text-zinc-400">System / Anonymous</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-700">
                        {log.action}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-600 font-semibold leading-relaxed max-w-md break-words">
                        {log.details}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-zinc-400 font-bold whitespace-nowrap">
                        {log.ipAddress || "127.0.0.1"}
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
  );
}
