"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExtractedAccount } from "@/lib/types";
import {
  X,
  Heart,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  XCircle,
  MessageSquare,
  Shield,
  Loader2,
  Check,
} from "lucide-react";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: ExtractedAccount;
  onSaved: (updatedAccount: Partial<ExtractedAccount>) => void;
}

const STATUS_OPTIONS = [
  {
    id: "verified",
    label: "Verified Working",
    desc: "Login active and verified",
    color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    icon: CheckCircle2,
  },
  {
    id: "high_value",
    label: "High Value / Keep",
    desc: "Rare shinies, coins, or max level",
    color: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    icon: Sparkles,
  },
  {
    id: "flagged",
    label: "Needs 2FA / Review",
    desc: "Requires manual verification",
    color: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
    icon: AlertTriangle,
  },
  {
    id: "dead",
    label: "Dead / Invalid",
    desc: "Credentials changed or banned",
    color: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    icon: XCircle,
  },
];

const QUICK_TAGS = [
  "Verified Working",
  "Webstore Buyer",
  "High IV / Shinies",
  "Changed Password",
  "PTC Active",
  "Ready for Transfer",
];

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  account,
  onSaved,
}) => {
  const [isChecked, setIsChecked] = useState<boolean>(account.isChecked !== false);
  const [isLiked, setIsLiked] = useState<boolean>(Boolean(account.isLiked));
  const [reviewStatus, setReviewStatus] = useState<string>(account.reviewStatus || "verified");
  const [reviewNote, setReviewNote] = useState<string>(account.reviewNote || "");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAppendTag = (tag: string) => {
    setReviewNote((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return tag;
      if (trimmed.includes(tag)) return trimmed;
      return `${trimmed} • ${tag}`;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("poke_vault_token") : null;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/accounts/review", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: account.email,
          isChecked: true, // Marking checked
          isLiked,
          reviewStatus,
          reviewNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save review");
      }

      onSaved({
        isChecked: true,
        isLiked,
        reviewStatus,
        reviewNote,
        reviewedAt: data.updated?.reviewedAt || new Date().toISOString(),
        reviewedBy: data.updated?.reviewedBy || "Operator",
      });

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving review";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#11141e] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06] bg-[#0c0e15]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">Account Verification & Review</h3>
              <p className="text-xs text-zinc-400 font-mono truncate max-w-[280px]">{account.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Top Options Row: Checked & Like */}
          <div className="grid grid-cols-2 gap-3">
            {/* Checked Toggle */}
            <button
              type="button"
              onClick={() => setIsChecked(!isChecked)}
              className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                isChecked
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/[0.12]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center border ${
                    isChecked
                      ? "bg-emerald-500 border-emerald-400 text-black"
                      : "border-zinc-700 bg-zinc-800"
                  }`}
                >
                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Checked</p>
                  <p className="text-[10px] text-zinc-400">Mark as reviewed</p>
                </div>
              </div>
            </button>

            {/* Like Toggle */}
            <button
              type="button"
              onClick={() => setIsLiked(!isLiked)}
              className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                isLiked
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.12)]"
                  : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/[0.12]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center border ${
                    isLiked
                      ? "bg-rose-500 border-rose-400 text-white"
                      : "border-zinc-700 bg-zinc-800 text-zinc-500"
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-white" : ""}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Favorite / Liked</p>
                  <p className="text-[10px] text-zinc-400">Pin to high priority</p>
                </div>
              </div>
            </button>
          </div>

          {/* Review Status Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">Verification Status</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = reviewStatus === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setReviewStatus(opt.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? opt.color
                        : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/[0.12]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-xs font-semibold">{opt.label}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5 pl-5.5">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Tags */}
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">Quick Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAppendTag(tag)}
                  className="px-2 py-1 rounded-md text-[11px] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.06] transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Review Note Input */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                Review Notes & Observations
              </span>
              <span className="text-[10px] text-zinc-500">Visible on card</span>
            </label>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={3}
              placeholder="e.g. Verified login on iOS device. 100 IV Tyranitar, 1500 coins confirmed. Ready for sale."
              className="w-full p-3 rounded-lg bg-[#0a0c12] border border-white/[0.08] text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 resize-none font-sans"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_2px_12px_rgba(16,185,129,0.25)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
