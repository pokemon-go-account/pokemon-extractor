"use client";

import React from "react";
import { motion } from "framer-motion";
import { DashboardMetrics } from "@/lib/types";
import {
  ShieldCheck,
  Award,
  Crown,
  CreditCard,
  Coins,
  Sparkles,
} from "lucide-react";

interface MetricsBarProps {
  metrics: DashboardMetrics;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ metrics }) => {
  const items = [
    {
      label: "Verified Hits",
      value: metrics.successfulHits.toLocaleString(),
      subtext: `${metrics.totalChecked.toLocaleString()} scanned`,
      icon: ShieldCheck,
      color: "text-emerald-400",
      accent: "group-hover:border-emerald-500/30",
    },
    {
      label: "Level 40+ Hits",
      value: metrics.highLevelCount.toLocaleString(),
      subtext: "High level accounts",
      icon: Award,
      color: "text-rose-400",
      accent: "group-hover:border-rose-500/30",
    },
    {
      label: "Level 50+ Hits",
      value: metrics.maxLevelCount.toLocaleString(),
      subtext: "Tier 50 and above",
      icon: Crown,
      color: "text-amber-400",
      accent: "group-hover:border-amber-500/30",
    },
    {
      label: "Prior Spenders",
      value: metrics.priorBuyersCount.toLocaleString(),
      subtext: "Webstore purchasers",
      icon: CreditCard,
      color: "text-red-400",
      accent: "group-hover:border-red-500/30",
    },
    {
      label: "Total PokéCoins",
      value: metrics.totalCoins.toLocaleString(),
      subtext: "Aggregated wealth",
      icon: Coins,
      color: "text-yellow-400",
      accent: "group-hover:border-yellow-500/30",
    },
    {
      label: "Total Stardust",
      value: metrics.totalStardust.toLocaleString(),
      subtext: "Combined resources",
      icon: Sparkles,
      color: "text-purple-400",
      accent: "group-hover:border-purple-500/30",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mb-6">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.03 }}
            className={`group p-3.5 sm:p-4 rounded-xl border border-white/[0.08] bg-zinc-950/70 hover:bg-zinc-900/60 backdrop-blur-xl flex flex-col justify-between transition-all duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.5)] ${item.accent}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-zinc-400 truncate">
                {item.label}
              </span>
              <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${item.color} shrink-0`} />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-bold font-mono text-white tracking-tight">
                {item.value}
              </div>
              <p className="text-[10px] sm:text-[11px] text-zinc-500 truncate mt-0.5 font-mono">
                {item.subtext}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
