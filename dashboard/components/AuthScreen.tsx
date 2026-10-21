"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SessionUser } from "@/lib/auth";
import {
  Shield,
  Key,
  Lock,
  Mail,
  ArrowRight,
  User,
  AlertCircle,
  CheckCircle2,
  Terminal,
  Server,
} from "lucide-react";

interface AuthScreenProps {
  onSuccess: (user: SessionUser) => void;
  isMongoConfigured?: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, isMongoConfigured = true }) => {
  const [tab, setTab] = useState<"passkey" | "login" | "register">("passkey");
  const [masterKey, setMasterKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleMasterKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterKey: masterKey.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed. Invalid passkey.");
      }

      if (data.token) {
        localStorage.setItem("poke_vault_token", data.token);
      }
      onSuccess(data.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Sign-in failed.");
      }

      if (data.token) {
        localStorage.setItem("poke_vault_token", data.token);
      }
      onSuccess(data.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          username: username.trim(),
          inviteCode: inviteCode.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      if (data.needsApproval) {
        setSuccessMsg(data.message || "Registration received. Pending administrator authorization.");
        setTab("login");
      } else {
        if (data.token) {
          localStorage.setItem("poke_vault_token", data.token);
        }
        onSuccess(data.user);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen vercel-bg flex flex-col justify-center items-center px-4 py-8 sm:py-12">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] rounded-full bg-white/[0.02] blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* Brand / Logo Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 border border-white/[0.12] text-zinc-100 mb-3 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <Shield className="w-5 h-5" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white vercel-gradient-text">
            VAULT INTELLIGENCE
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Authorized Personnel Access Gate
          </p>
        </div>

        {/* Main Glass Card */}
        <div className="vercel-card rounded-2xl p-6 sm:p-7 border border-white/[0.08]">
          {/* Segmented Pill Tab Switcher */}
          <div className="flex p-1 rounded-xl bg-zinc-950/80 border border-white/[0.06] mb-5">
            <button
              type="button"
              onClick={() => { setTab("passkey"); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                tab === "passkey"
                  ? "bg-white/[0.1] text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Master Key
            </button>
            <button
              type="button"
              onClick={() => { setTab("login"); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                tab === "login"
                  ? "bg-white/[0.1] text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Email Login
            </button>
            <button
              type="button"
              onClick={() => { setTab("register"); setError(null); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                tab === "register"
                  ? "bg-white/[0.1] text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Register
            </button>
          </div>

          {/* Feedback alerts */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="leading-snug">{error}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="leading-snug">{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab 1: Master Passkey */}
          {tab === "passkey" && (
            <form onSubmit={handleMasterKeySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Administrator Passkey
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    value={masterKey}
                    onChange={(e) => setMasterKey(e.target.value)}
                    placeholder="Enter master passkey..."
                    autoFocus
                    required
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-black/60 border border-white/[0.08] text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white/[0.25] transition-all"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5 font-mono">
                  Configured via <code className="text-zinc-400">ADMIN_INVITE_CODE</code>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !masterKey.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:hover:bg-white shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                <span>{loading ? "Authenticating..." : "Unlock Vault"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* Tab 2: Email Login */}
          {tab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@vault.com"
                    required
                    className="w-full pl-10 pr-3 py-2 rounded-xl bg-black/60 border border-white/[0.08] text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white/[0.25] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-3 py-2 rounded-xl bg-black/60 border border-white/[0.08] text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white/[0.25] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim() || !password}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:hover:bg-white"
              >
                <span>{loading ? "Signing in..." : "Sign In"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* Tab 3: Register */}
          {tab === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Username</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="OperatorAlias"
                    className="w-full pl-10 pr-3 py-2 rounded-xl bg-black/60 border border-white/[0.08] text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white/[0.25] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@vault.com"
                    required
                    className="w-full pl-10 pr-3 py-2 rounded-xl bg-black/60 border border-white/[0.08] text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white/[0.25] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-3 py-2 rounded-xl bg-black/60 border border-white/[0.08] text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white/[0.25] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Admin Invite Code <span className="text-zinc-500">(Optional)</span>
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter invite code for auto-approval..."
                    className="w-full pl-10 pr-3 py-2 rounded-xl bg-black/60 border border-white/[0.08] text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white/[0.25] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim() || !password}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:hover:bg-white"
              >
                <span>{loading ? "Creating..." : "Request Access"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>

        {/* Security Notice Footer */}
        <div className="mt-6 text-center text-[11px] text-zinc-500 font-mono flex items-center justify-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-zinc-600" />
          <span>Encrypted Session • Rate-Limited Authentication</span>
        </div>
      </motion.div>
    </div>
  );
};
