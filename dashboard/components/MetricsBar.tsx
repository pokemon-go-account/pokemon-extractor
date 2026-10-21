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
      border: "border-emerald-500/20",
      bg: "bg-emerald-500/5",
    },
    {
      label: "Level 40+ Hits",
      value: metrics.highLevelCount.toLocaleString(),
      subtext: "High level accounts",
      icon: Award,
      color: "text-rose-400",
      border: "border-rose-500/20",
      bg: "bg-rose-500/5",
    },
    {
      label: "Level 50+ Hits",
      value: metrics.maxLevelCount.toLocaleString(),
      subtext: "Tier 50 and above",
      icon: Crown,
      color: "text-amber-400",
      border: "border-amber-500/20",
      bg: "bg-amber-500/5",
    },
    {
      label: "Prior Spenders",
      value: metrics.priorBuyersCount.toLocaleString(),
      subtext: "Webstore purchasers",
      icon: CreditCard,
      color: "text-red-400",
      border: "border-red-500/20",
      bg: "bg-red-500/5",
    },
    {
      label: "Total PokéCoins",
      value: metrics.totalCoins.toLocaleString(),
      subtext: "Aggregated wealth",
      icon: Coins,
      color: "text-yellow-400",
      border: "border-yellow-500/20",
      bg: "bg-yellow-500/5",
    },
    {
      label: "Total Stardust",
      value: metrics.totalStardust.toLocaleString(),
      subtext: "Combined resources",
      icon: Sparkles,
      color: "text-purple-400",
      border: "border-purple-500/20",
      bg: "bg-purple-500/5",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.04 }}
            className={`p-4 rounded-xl border ${item.border} ${item.bg} bg-[#11131c]/60 backdrop-blur-md flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider truncate">
                {item.label}
              </span>
              <Icon className={`w-4 h-4 ${item.color} shrink-0`} />
            </div>
            <div>
              <div className="text-xl font-bold font-mono text-zinc-100 tracking-tight">
                {item.value}
              </div>
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">{item.subtext}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
