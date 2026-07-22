"use client";

import React, { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Check, X, AlertCircle, CheckCircle2, FileText, Loader2 } from "lucide-react";

interface ScriptItem {
  _id: string;
  title: string;
  fileName: string;
  scriptContent: string;
  videoUrl: string;
  status: "PENDING_REVIEW" | "APPROVED" | "CORRECTION_REQUESTED";
  clientFeedback?: string;
  writerId: { name: string; email: string; designation?: string };
  createdAt: string;
}

export default function ClientPortalPage() {
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activeScriptId, setActiveScriptId] = useState<string | null>(null);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchScripts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/scripts");
      if (res.ok) {
        const data = await res.json();
        setScripts(data.scripts || []);
      } else {
        setError("Failed to load scripts for review.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScripts();
  }, []);

  const handleReviewAction = async (id: string, action: "APPROVE" | "CORRECTION") => {
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/scripts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          feedback: feedbackInput,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(action === "APPROVE" ? "Script approved successfully!" : "Corrections submitted to writer.");
        setActiveScriptId(null);
        setFeedbackInput("");
        fetchScripts();
      } else {
        setError(data.error || "Failed to update script.");
      }
    } catch {
      setError("Failed to process action.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] p-4 md:p-8 space-y-6 max-w-5xl mx-auto text-[#2D221E]">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">REIZ Media Client Portal</h1>
        <p className="text-xs sm:text-sm font-bold text-[#8C7A6B]">
          Review submitted video scripts, approve deliverables, or submit corrections to your content writer.
        </p>
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

      <Card className="border border-[#E8DFD3] shadow-sm bg-[#FAF6F0] overflow-hidden">
        <CardHeader className="bg-[#F5EFE6] border-b border-[#E8DFD3] py-3.5 px-6">
          <h2 className="text-base font-black flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#B87C4C]" />
            <span>Pending Video Scripts & Content Review</span>
          </h2>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="py-16 text-center text-[#8C7A6B] font-bold text-sm">Loading client scripts...</div>
          ) : scripts.length === 0 ? (
            <div className="py-16 text-center text-[#8C7A6B] font-bold text-sm">No scripts submitted for review yet.</div>
          ) : (
            <div className="divide-y divide-[#E8DFD3]">
              {scripts.map((script) => (
                <div key={script._id} className="p-5 bg-white space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#F5EFE6] pb-2">
                    <div>
                      <h3 className="font-black text-[#2D221E] text-base sm:text-lg">{script.title}</h3>
                      <p className="text-xs text-[#8C7A6B] font-bold">
                        Writer: <span className="text-[#2D221E]">{script.writerId?.name}</span> ({script.writerId?.email})
                      </p>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold self-start sm:self-auto ${
                      script.status === "APPROVED" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                      script.status === "CORRECTION_REQUESTED" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                      "bg-[#E8DFD3] text-[#8C7A6B]"
                    }`}>
                      {script.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  {script.fileName && (
                    <p className="text-xs font-bold text-[#B87C4C]">
                      Video File Name: <span className="text-[#2D221E] font-medium">{script.fileName}</span>
                    </p>
                  )}

                  <div className="bg-[#FAF6F0] border border-[#E8DFD3] p-4 rounded-xl font-mono text-xs text-[#2D221E] whitespace-pre-wrap leading-relaxed">
                    {script.scriptContent}
                  </div>

                  {script.clientFeedback && (
                    <div className="bg-[#F7EBE1] border border-[#E8DFD3] p-3 rounded-xl text-xs text-[#2D221E]">
                      <span className="font-bold text-[#B87C4C]">Your Feedback/Notes: </span>
                      {script.clientFeedback}
                    </div>
                  )}

                  {/* Review Action Controls */}
                  {script.status !== "APPROVED" && (
                    <div className="pt-2 border-t border-[#F5EFE6] space-y-3">
                      {activeScriptId === script._id ? (
                        <div className="space-y-3 bg-[#FAF6F0] p-4 rounded-xl border border-[#E8DFD3]">
                          <label className="block text-xs font-bold uppercase tracking-wider text-[#8C7A6B]">
                            Correction / Feedback Notes for Writer
                          </label>
                          <textarea
                            value={feedbackInput}
                            onChange={(e) => setFeedbackInput(e.target.value)}
                            rows={3}
                            placeholder="Specify exact changes needed in hook, timing, or script..."
                            className="w-full rounded-xl border border-[#E8DFD3] bg-white p-3 text-xs font-medium text-[#2D221E] focus:outline-none focus:ring-2 focus:ring-[#362722]"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setActiveScriptId(null)}
                              className="px-4 py-2 rounded-xl border border-[#E8DFD3] bg-white text-xs font-bold text-[#8C7A6B]"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleReviewAction(script._id, "CORRECTION")}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-700 text-white text-xs font-bold hover:bg-amber-800"
                            >
                              Submit Corrections
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => handleReviewAction(script._id, "APPROVE")}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 shadow-xs"
                          >
                            <Check className="h-4 w-4" />
                            Approve Script
                          </button>
                          <button
                            onClick={() => { setActiveScriptId(script._id); setFeedbackInput(""); }}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-[#E8DFD3] bg-white text-xs font-bold text-[#2D221E] hover:bg-[#F5EFE6]"
                          >
                            <X className="h-4 w-4 text-amber-700" />
                            Request Corrections
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
