"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleVisibility = () => setIsVisible(!isVisible);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed. Please try again.");
      } else {
        const isAdmin = ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(data.user?.role);
        router.push(isAdmin ? "/admin" : "/dashboard");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF6F0] px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#362722] text-[#FAF6F0] font-black text-2xl shadow-md mb-4">
            R
          </div>
          <h1 className="text-3xl font-black text-[#2D221E] tracking-tight">REIZ MEDIA</h1>
          <p className="mt-1 text-xs font-extrabold uppercase tracking-widest text-[#B87C4C]">
            REIZ Portal Sign In
          </p>
        </div>

        {error && (
          <Alert color="danger">
            {error}
          </Alert>
        )}

        <Card className="border border-[#E8DFD3] shadow-sm bg-white">
          <CardBody className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#8C7A6B] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-4 w-4 text-[#8C7A6B]" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@reizmedia.com"
                    required
                    className="w-full rounded-xl border border-[#E8DFD3] bg-[#FAF6F0] pl-10 pr-3 py-2.5 text-sm font-bold text-[#2D221E] placeholder-[#8C7A6B]/50 focus:outline-none focus:ring-2 focus:ring-[#362722]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#8C7A6B] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-4 w-4 text-[#8C7A6B]" />
                  </div>
                  <input
                    type={isVisible ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-xl border border-[#E8DFD3] bg-[#FAF6F0] pl-10 pr-10 py-2.5 text-sm font-bold text-[#2D221E] placeholder-[#8C7A6B]/50 focus:outline-none focus:ring-2 focus:ring-[#362722]"
                  />
                  <button
                    type="button"
                    onClick={toggleVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#8C7A6B] hover:text-[#2D221E]"
                  >
                    {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#362722] py-3 text-sm font-bold text-[#FAF6F0] hover:bg-[#261A16] disabled:opacity-50 transition-colors shadow-xs"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin text-[#C68B59]" /> Signing In…</> : "Sign In"}
              </button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
