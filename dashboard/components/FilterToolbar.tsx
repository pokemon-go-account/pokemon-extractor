"use client";

import React from "react";
import { FilterOptions } from "@/lib/types";
import {
  Search,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Download,
  FileSpreadsheet,
} from "lucide-react";

interface FilterToolbarProps {
  filters: FilterOptions;
  onChange: (filters: FilterOptions) => void;
  onExportCsv: () => void;
  onExportTxt: () => void;
  totalResults: number;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  filters,
  onChange,
  onExportCsv,
  onExportTxt,
  totalResults,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, search: e.target.value, page: 1 });
  };

  const clearSearch = () => {
    onChange({ ...filters, search: "", page: 1 });
  };

  return (
    <div className="space-y-3 mb-6 p-4 rounded-xl border border-white/[0.08] bg-[#11131c]/80 backdrop-blur-md">
      {/* Top Search & Actions Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="Search by email, game email, country, or keyword..."
            className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-[#0a0c12] border border-white/[0.08] text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
          {filters.search && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={filters.sortBy}
              onChange={(e) =>
                onChange({
                  ...filters,
                  sortBy: e.target.value as FilterOptions["sortBy"],
                  page: 1,
                })
              }
              aria-label="Sort accounts"
              className="appearance-none pl-8 pr-8 py-2.5 rounded-lg bg-[#0a0c12] border border-white/[0.08] text-xs font-medium text-zinc-300 hover:border-white/[0.14] focus:outline-none transition-colors cursor-pointer"
            >
              <option value="newest">Sort: Newest Extracted</option>
              <option value="level_desc">Sort: Highest Level</option>
              <option value="coins_desc">Sort: Most PokéCoins</option>
              <option value="stardust_desc">Sort: Most Stardust</option>
            </select>
            <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          </div>

          {/* Export Buttons */}
          <button
            type="button"
            onClick={onExportCsv}
            title="Export filtered accounts as CSV"
            className="px-3 py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            type="button"
            onClick={onExportTxt}
            title="Export filtered combos as email:pass TXT"
            className="px-3 py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Combos TXT</span>
          </button>
        </div>
      </div>

      {/* Filter Chips Row */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.05]">
        <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1 mr-1">
          <SlidersHorizontal className="w-3 h-3" />
          Filter:
        </span>

        {/* Level Tiers */}
        <div className="flex items-center gap-1 bg-[#0a0c12] p-0.5 rounded-lg border border-white/[0.06]">
          {[
            { id: "all", label: "All Levels" },
            { id: "50", label: "Lvl 50+" },
            { id: "40", label: "Lvl 40+" },
            { id: "30", label: "Lvl 30+" },
            { id: "failed", label: "Failed/Invalid" },
          ].map((tier) => (
            <button
              key={tier.id}
              type="button"
              onClick={() =>
                onChange({
                  ...filters,
                  levelTier: tier.id as FilterOptions["levelTier"],
                  page: 1,
                })
              }
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                filters.levelTier === tier.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
              }`}
            >
              {tier.label}
            </button>
          ))}
        </div>

        {/* Spender Status */}
        <div className="flex items-center gap-1 bg-[#0a0c12] p-0.5 rounded-lg border border-white/[0.06]">
          {[
            { id: "all", label: "Any Spender" },
            { id: "spenders", label: "Prior Spenders" },
            { id: "first_time", label: "First-Time" },
          ].map((sp) => (
            <button
              key={sp.id}
              type="button"
              onClick={() =>
                onChange({
                  ...filters,
                  spenderStatus: sp.id as FilterOptions["spenderStatus"],
                  page: 1,
                })
              }
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                filters.spenderStatus === sp.id
                  ? "bg-red-600/80 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
              }`}
            >
              {sp.label}
            </button>
          ))}
        </div>

        {/* Team Filter */}
        <div className="flex items-center gap-1 bg-[#0a0c12] p-0.5 rounded-lg border border-white/[0.06]">
          {[
            { id: "all", label: "All Teams" },
            { id: "mystic", label: "Mystic" },
            { id: "valor", label: "Valor" },
            { id: "instinct", label: "Instinct" },
            { id: "none", label: "None" },
          ].map((tm) => (
            <button
              key={tm.id}
              type="button"
              onClick={() =>
                onChange({
                  ...filters,
                  team: tm.id as FilterOptions["team"],
                  page: 1,
                })
              }
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                filters.team === tm.id
                  ? "bg-blue-600/80 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
              }`}
            >
              {tm.label}
            </button>
          ))}
        </div>

        {/* Results Counter */}
        <div className="ml-auto text-xs font-mono text-zinc-500">
          Showing <span className="text-zinc-200 font-semibold">{totalResults}</span> matches
        </div>
      </div>
    </div>
  );
};
