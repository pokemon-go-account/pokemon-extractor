"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  FileCode,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Upload,
} from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [tab, setTab] = useState<"json" | "telegram">("json");
  const [rawTelegramText, setRawTelegramText] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  if (!isOpen) return null;

  const getAuthHeaders = (): Record<string, string> => {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("poke_vault_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleJsonImport = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/import/json", {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setStatusMsg({
        type: "success",
        text: `Successfully imported ${data.importedCount} accounts from ${data.sourceFile} into MongoDB Atlas!`,
      });
      onImportComplete();
    } catch (err: unknown) {
      setStatusMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Import failed",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramImport = async () => {
    if (!rawTelegramText.trim()) return;
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/import/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ rawText: rawTelegramText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Telegram import failed");
      setStatusMsg({
        type: "success",
        text: `Parsed and imported ${data.upsertedCount} accounts into MongoDB Atlas!`,
      });
      setRawTelegramText("");
      onImportComplete();
    } catch (err: unknown) {
      setStatusMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Telegram import failed",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg p-6 rounded-2xl border border-white/[0.08] bg-[#11131c] shadow-2xl relative"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-500 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">Import Historical Data</h2>
            <p className="text-xs text-zinc-400">Sync existing accounts into MongoDB Atlas</p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex p-1 rounded-lg bg-[#0a0c12] border border-white/[0.06] mb-4">
          <button
            type="button"
            onClick={() => { setTab("json"); setStatusMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors ${
              tab === "json" ? "bg-white/[0.08] text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Local JSON Files
          </button>
          <button
            type="button"
            onClick={() => { setTab("telegram"); setStatusMsg(null); }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors ${
              tab === "telegram" ? "bg-white/[0.08] text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Telegram Chat Text
          </button>
        </div>

        {/* Status Alert */}
        {statusMsg && (
          <div
            className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 border ${
              statusMsg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-red-500/10 border-red-500/20 text-red-300"
            }`}
          >
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Tab 1: JSON */}
        {tab === "json" && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Instantly scans your root project directory for <code className="text-zinc-300">levels_results.json</code> and <code className="text-zinc-300">partial_results.json</code> and batch upserts all accounts directly into your MongoDB Atlas cluster.
            </p>

            <button
              type="button"
              onClick={handleJsonImport}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <FileCode className="w-4 h-4" />
              <span>{loading ? "Importing Accounts..." : "Import from Local JSON"}</span>
            </button>
          </div>
        )}

        {/* Tab 2: Telegram */}
        {tab === "telegram" && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Paste raw Telegram notification messages from your bot channel below. The parser will extract credentials, levels, PokéCoins, and spender flags automatically.
            </p>

            <textarea
              rows={6}
              value={rawTelegramText}
              onChange={(e) => setRawTelegramText(e.target.value)}
              placeholder="Paste raw Telegram messages here... (e.g. • Combo: email:password ... Level 42 ...)"
              className="w-full p-3 rounded-lg bg-[#0a0c12] border border-white/[0.08] text-xs font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
            />

            <button
              type="button"
              onClick={handleTelegramImport}
              disabled={loading || !rawTelegramText.trim()}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{loading ? "Parsing & Upserting..." : "Parse & Import to Atlas"}</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
