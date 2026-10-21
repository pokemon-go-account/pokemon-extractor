"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ExtractedAccount } from "@/lib/types";
import {
  Coins,
  Sparkles,
  Copy,
  Check,
  Eye,
  EyeOff,
  ShoppingBag,
  CreditCard,
  Shield,
  MapPin,
  Clock,
  Layers,
  Box,
  Heart,
  CheckCircle2,
  MessageSquare,
  Edit3,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { ReviewModal } from "./ReviewModal";

interface AccountCardProps {
  account: ExtractedAccount;
  onAccountUpdate?: (updated: ExtractedAccount) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({ account: initialAccount, onAccountUpdate }) => {
  const [account, setAccount] = useState<ExtractedAccount>(initialAccount);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  // Sync if prop changes
  React.useEffect(() => {
    setAccount(initialAccount);
  }, [initialAccount]);

  const numLevel = Number(account.level);
  const isNumericLevel = !isNaN(numLevel);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const combo = `${account.email}:${account.password || ""}`;

  // Quick toggle like handler
  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (likeLoading) return;
    setLikeLoading(true);

    const nextLiked = !account.isLiked;
    const updated = { ...account, isLiked: nextLiked };
    setAccount(updated);
    if (onAccountUpdate) onAccountUpdate(updated);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("poke_vault_token") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      await fetch("/api/accounts/review", {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: account.email,
          isLiked: nextLiked,
        }),
      });
    } catch {
      // Revert if network failed
      setAccount(account);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleReviewSaved = (changes: Partial<ExtractedAccount>) => {
    const updated = { ...account, ...changes };
    setAccount(updated);
    if (onAccountUpdate) onAccountUpdate(updated);
  };

  // Team badge styling
  const getTeamInfo = (teamVal?: string | number) => {
    const t = String(teamVal || "").toLowerCase();
    if (t.includes("mystic") || t === "1" || t.includes("blue")) {
      return { name: "Mystic", color: "text-blue-400 border-blue-500/20 bg-blue-500/10" };
    }
    if (t.includes("valor") || t === "2" || t.includes("red")) {
      return { name: "Valor", color: "text-red-400 border-red-500/20 bg-red-500/10" };
    }
    if (t.includes("instinct") || t === "3" || t.includes("yellow")) {
      return { name: "Instinct", color: "text-amber-400 border-amber-500/20 bg-amber-500/10" };
    }
    return { name: "Teamless", color: "text-zinc-400 border-zinc-700/40 bg-zinc-800/20" };
  };

  const teamInfo = getTeamInfo(account.team);

  // Level Badge styling
  const getLevelBadge = () => {
    if (!isNumericLevel) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-zinc-700 bg-zinc-800/40 text-zinc-400">
          <Shield className="w-3 h-3" />
          {String(account.level || "Unknown")}
        </span>
      );
    }
    if (numLevel >= 50) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
          <Shield className="w-3 h-3 text-amber-400" />
          Level {numLevel}
        </span>
      );
    }
    if (numLevel >= 40) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-rose-500/30 bg-rose-500/10 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
          <Shield className="w-3 h-3 text-rose-400" />
          Level {numLevel}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
        <Shield className="w-3 h-3 text-indigo-400" />
        Level {numLevel}
      </span>
    );
  };

  const getStatusBadge = () => {
    switch (account.reviewStatus) {
      case "high_value":
        return { label: "High Value", color: "text-amber-400 border-amber-500/25 bg-amber-500/10", icon: Sparkles };
      case "flagged":
        return { label: "Needs 2FA", color: "text-yellow-400 border-yellow-500/25 bg-yellow-500/10", icon: AlertTriangle };
      case "dead":
        return { label: "Dead / Banned", color: "text-rose-400 border-rose-500/25 bg-rose-500/10", icon: XCircle };
      default:
        return { label: "Verified Working", color: "text-emerald-400 border-emerald-500/25 bg-emerald-500/10", icon: CheckCircle2 };
    }
  };

  const statusInfo = getStatusBadge();
  const StatusIcon = statusInfo.icon;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.2 }}
        className={`group relative flex flex-col justify-between p-5 rounded-xl border transition-all duration-200 ${
          account.isChecked
            ? "border-emerald-500/25 bg-[#121622]/95 hover:border-emerald-500/40 shadow-[0_4px_24px_rgba(16,185,129,0.04)]"
            : account.isLiked
            ? "border-rose-500/25 bg-[#17131d]/95 hover:border-rose-500/40"
            : "border-white/[0.07] bg-[#11131c]/90 hover:border-white/[0.16] hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
        }`}
      >
        {/* Top Header Row */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {getLevelBadge()}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${teamInfo.color}`}
              >
                {teamInfo.name}
              </span>
              {account.isFirstTimeBuyer === false && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-red-500/30 bg-red-500/10 text-red-300">
                  <CreditCard className="w-3 h-3" />
                  Prior Spender
                </span>
              )}
            </div>

            {/* Like & Checked Action Controls */}
            <div className="flex items-center gap-1.5">
              {/* Like Button */}
              <button
                type="button"
                onClick={handleToggleLike}
                disabled={likeLoading}
                className={`p-1.5 rounded-lg border transition-all ${
                  account.isLiked
                    ? "border-rose-500/40 bg-rose-500/15 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.2)]"
                    : "border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:text-rose-400 hover:border-rose-500/30"
                }`}
                title={account.isLiked ? "Liked (Click to unlike)" : "Like / Favorite account"}
              >
                <Heart className={`w-3.5 h-3.5 ${account.isLiked ? "fill-rose-400" : ""}`} />
              </button>

              {/* Checked Button / Badge */}
              {account.isChecked ? (
                <button
                  type="button"
                  onClick={() => setIsReviewOpen(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                  title="Checked (Click to edit review)"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Checked</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsReviewOpen(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-white hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all"
                  title="Tap Checked to review and verify"
                >
                  <Check className="w-3 h-3 text-zinc-400" />
                  <span>Tap Checked</span>
                </button>
              )}
            </div>
          </div>

          {/* Credentials Box */}
          <div className="p-3 rounded-lg bg-[#0b0c13] border border-white/[0.05] mb-3 space-y-2">
            {/* Email row */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-zinc-500 font-mono text-[11px]">USER</span>
              <div className="flex items-center gap-1.5 font-mono text-zinc-200 truncate max-w-[210px]">
                <span className="truncate">{account.email}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(account.email, "email")}
                  className="text-zinc-500 hover:text-white transition-colors p-0.5"
                  title="Copy username"
                >
                  {copiedField === "email" ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            {/* Password row */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-zinc-500 font-mono text-[11px]">PASS</span>
              <div className="flex items-center gap-1.5 font-mono text-zinc-200">
                <span className="truncate max-w-[170px]">
                  {showPassword ? account.password || "N/A" : "••••••••••••"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-zinc-500 hover:text-white transition-colors p-0.5"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(account.password || "", "pass")}
                  className="text-zinc-500 hover:text-white transition-colors p-0.5"
                  title="Copy password"
                >
                  {copiedField === "pass" ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Review Box (Shown when account is checked or has review notes) */}
          {account.isChecked && (
            <div className="p-3 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/20 text-xs mb-3 space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${statusInfo.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {statusInfo.label}
                </span>
                <button
                  type="button"
                  onClick={() => setIsReviewOpen(true)}
                  className="text-[10px] text-zinc-400 hover:text-emerald-300 flex items-center gap-1 font-mono transition-colors"
                >
                  <Edit3 className="w-2.5 h-2.5" />
                  Edit Review
                </button>
              </div>

              {account.reviewNote ? (
                <p className="text-zinc-200 text-[11px] italic bg-black/25 p-2 rounded border border-white/[0.04]">
                  "{account.reviewNote}"
                </p>
              ) : (
                <p className="text-zinc-400 text-[10px] italic">Verified and checked.</p>
              )}

              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-0.5">
                <span>By: {account.reviewedBy || "Operator"}</span>
                {account.reviewedAt && <span>{new Date(account.reviewedAt).toLocaleDateString()}</span>}
              </div>
            </div>
          )}

          {/* Numeric stats grid */}
          {isNumericLevel && (
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">PokéCoins</p>
                  <p className="font-mono font-medium text-zinc-200">
                    {Number(account.pokeCoins || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Stardust</p>
                  <p className="font-mono font-medium text-zinc-200">
                    {Number(account.stardust || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <ShoppingBag className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Item Bag</p>
                  <p className="font-mono font-medium text-zinc-200">{account.itemBag || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <Box className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Storage</p>
                  <p className="font-mono font-medium text-zinc-200">
                    {account.pokemonStorage || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Extra info metadata row */}
          <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
            {account.country && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-zinc-400" />
                {account.country}
              </span>
            )}
            {account.source && (
              <span className="flex items-center gap-1 font-mono">
                <Layers className="w-3 h-3 text-zinc-400" />
                {account.source}
              </span>
            )}
            {account.extractedAt && (
              <span className="flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-zinc-400" />
                {new Date(account.extractedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Action Footer Buttons */}
        <div className="mt-4 pt-3 border-t border-white/[0.05] grid grid-cols-2 gap-2">
          {/* Tap Checked / Review button */}
          <button
            type="button"
            onClick={() => setIsReviewOpen(true)}
            className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all duration-150 border ${
              account.isChecked
                ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                : "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border-white/[0.06]"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{account.isChecked ? "Reviewed" : "Tap Checked"}</span>
          </button>

          {/* Copy Combo Button */}
          <button
            type="button"
            onClick={() => copyToClipboard(combo, "combo")}
            className="py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.06] transition-all duration-150"
          >
            {copiedField === "combo" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Combo</span>
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Review Dialog */}
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        account={account}
        onSaved={handleReviewSaved}
      />
    </>
  );
};
