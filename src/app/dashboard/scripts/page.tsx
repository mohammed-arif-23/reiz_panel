"use client";

import React, { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { FileText, CheckCircle2, AlertCircle, Clock, Send, Check, X } from "lucide-react";

interface ClientOption {
  _id: string;
  name: string;
  email: string;
  designation?: string;
}

interface ScriptItem {
  _id: string;
  title: string;
  fileName: string;
  scriptContent: string;
  videoUrl: string;
  status: "PENDING_REVIEW" | "APPROVED" | "CORRECTION_REQUESTED";
  clientFeedback?: string;
  clientId: ClientOption;
  writerId: { name: string; email: string };
  createdAt: string;
}

export default function ScriptSubmissionsPage() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form State
  const [selectedClientId, setSelectedClientId] = useState("");
  const [title, setTitle] = useState("");
  const [scriptContent, setScriptContent] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientsRes, scriptsRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/scripts"),
      ]);

      if (clientsRes.ok) {
        const cData = await clientsRes.json();
        setClients(cData.clients || []);
      }
      if (scriptsRes.ok) {
        const sData = await scriptsRes.json();
        setScripts(sData.scripts || []);
      }
    } catch {
      setError("Failed to load script submission data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !title || !scriptContent) {
      setError("Please select a client and fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          title,
          fileName: "",
          scriptContent,
          videoUrl: "",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess("Script/Deliverable submitted for client review!");
        setTitle("");
        setScriptContent("");
        fetchData();
      } else {
        setError(data.error || "Failed to submit script.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#2D221E] md:text-3xl">
          Content Scripts & Deliverables
        </h1>
        <p className="text-[#8C7A6B] font-bold mt-1 text-xs sm:text-sm">
          Submit video scripts & draft deliverables for client review and correction requests.
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

      {/* New Submission Form */}
      <Card className="border border-[#E8DFD3] shadow-sm bg-white">
        <CardHeader className="bg-[#F5EFE6] border-b border-[#E8DFD3] py-3.5 px-6">
          <h2 className="text-base font-black text-[#2D221E] flex items-center gap-2">
            <Send className="h-4 w-4 text-[#B87C4C]" />
            <span>Submit New Script / Content for Client Review</span>
          </h2>
        </CardHeader>
        <CardBody className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#8C7A6B] mb-1.5">
                  Select Client *
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[#E8DFD3] bg-[#FAF6F0] px-3.5 py-2.5 text-xs font-bold text-[#2D221E] focus:outline-none focus:ring-2 focus:ring-[#362722]"
                >
                  <option value="">— Select Target Client —</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#8C7A6B] mb-1.5">
                  Video / Script Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Real Estate Promo Video Reel Script"
                  required
                  className="w-full rounded-xl border border-[#E8DFD3] bg-[#FAF6F0] px-3.5 py-2.5 text-xs font-bold text-[#2D221E] focus:outline-none focus:ring-2 focus:ring-[#362722]"
                />
              </div>
            </div>

            {/* Removed Video File Name & Resource Link inputs per request */}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8C7A6B] mb-1.5">
                Script / Content Body *
              </label>
              <textarea
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
                rows={5}
                required
                placeholder="Hook: Tired of low engagement?\nBody: Here is how we transform your identity...\nCTA: Comment REIZ below."
                className="w-full rounded-xl border border-[#E8DFD3] bg-[#FAF6F0] p-3.5 text-xs font-mono text-[#2D221E] focus:outline-none focus:ring-2 focus:ring-[#362722]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || clients.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#362722] px-6 py-2.5 text-xs font-bold text-[#FAF6F0] hover:bg-[#261A16] disabled:opacity-50 transition-colors shadow-xs"
            >
              {submitting ? "Submitting..." : "Send Script to Client"}
            </button>
          </form>
        </CardBody>
      </Card>

      {/* Submitted Scripts Feed */}
      <Card className="border border-[#E8DFD3] shadow-sm bg-[#FAF6F0] overflow-hidden">
        <CardHeader className="bg-[#F5EFE6] border-b border-[#E8DFD3] py-3.5 px-6">
          <h2 className="text-base font-black text-[#2D221E]">Submitted Scripts & Client Reviews</h2>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="py-12 text-center text-[#8C7A6B] font-bold text-sm">Loading scripts...</div>
          ) : scripts.length === 0 ? (
            <div className="py-12 text-center text-[#8C7A6B] font-bold text-sm">No scripts submitted yet.</div>
          ) : (
            <div className="divide-y divide-[#E8DFD3]">
              {scripts.map((script) => (
                <div key={script._id} className="p-5 bg-white space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#F5EFE6] pb-2">
                    <div>
                      <h3 className="font-extrabold text-[#2D221E] text-base">{script.title}</h3>
                      <p className="text-xs text-[#8C7A6B] font-bold">
                        Client: <span className="text-[#2D221E]">{script.clientId?.name}</span> ({script.clientId?.email})
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-auto ${
                      script.status === "APPROVED" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                      script.status === "CORRECTION_REQUESTED" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                      "bg-[#E8DFD3] text-[#8C7A6B]"
                    }`}>
                      {script.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Removed Video File Name display per request */}

                  <div className="bg-[#FAF6F0] border border-[#E8DFD3] p-3.5 rounded-xl font-mono text-xs text-[#2D221E] whitespace-pre-wrap">
                    {script.scriptContent}
                  </div>

                  {script.clientFeedback && (
                    <div className="bg-[#F7EBE1] border border-[#E8DFD3] p-3 rounded-xl text-xs text-[#2D221E]">
                      <span className="font-bold text-[#B87C4C]">Client Feedback: </span>
                      {script.clientFeedback}
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
