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
} from "lucide-react";

interface AccountCardProps {
  account: ExtractedAccount;
}

export const AccountCard: React.FC<AccountCardProps> = ({ account }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const numLevel = Number(account.level);
  const isNumericLevel = !isNaN(numLevel);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const combo = `${account.email}:${account.password || ""}`;

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col justify-between p-5 rounded-xl border border-white/[0.07] bg-[#11131c]/90 hover:border-white/[0.16] hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-all duration-200"
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
          </div>

          {/* Webstore Buyer Status */}
          {account.isFirstTimeBuyer === false && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-red-500/30 bg-red-500/10 text-red-300">
              <CreditCard className="w-3 h-3" />
              Prior Spender
            </span>
          )}
          {account.isFirstTimeBuyer === true && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              First-Time Buyer
            </span>
          )}
        </div>

        {/* Credentials Box */}
        <div className="p-3 rounded-lg bg-[#0b0c13] border border-white/[0.05] mb-4 space-y-2">
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

      {/* 1-Click Copy Combo Footer Button */}
      <div className="mt-4 pt-3 border-t border-white/[0.05]">
        <button
          type="button"
          onClick={() => copyToClipboard(combo, "combo")}
          className="w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.06] transition-all duration-150"
        >
          {copiedField === "combo" ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Combo Copied</span>
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
  );
};
