"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Upload,
  Users,
  LogOut,
  RefreshCw,
  Database,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LayoutGrid,
  Radio,
} from "lucide-react";
import { ExtractedAccount, DashboardMetrics, FilterOptions } from "@/lib/types";
import { SessionUser } from "@/lib/auth";
import { AccountCard } from "@/components/AccountCard";
import { MetricsBar } from "@/components/MetricsBar";
import { FilterToolbar } from "@/components/FilterToolbar";
import { AuthModal } from "@/components/AuthModal";
import { ImportModal } from "@/components/ImportModal";
import { AdminUsersModal } from "@/components/AdminUsersModal";
import { TelegramLiveFeed } from "@/components/TelegramLiveFeed";

export default function DashboardPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMongoConnected, setIsMongoConnected] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "telegram">("telegram");

  const [accounts, setAccounts] = useState<ExtractedAccount[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalChecked: 0,
    successfulHits: 0,
    highLevelCount: 0,
    maxLevelCount: 0,
    priorBuyersCount: 0,
    totalCoins: 0,
    totalStardust: 0,
    teamBreakdown: { mystic: 0, valor: 0, instinct: 0, none: 0 },
  });

  const [filters, setFilters] = useState<FilterOptions>({
    search: "",
    levelTier: "all",
    spenderStatus: "all",
    team: "all",
    sortBy: "newest",
    page: 1,
    limit: 50,
  });

  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>("local_file_fallback");

  // Helper to get auth headers with Bearer token if present
  const getAuthHeaders = (): Record<string, string> => {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("poke_vault_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Check auth session on mount
  const checkSession = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch("/api/auth/me", { headers });
      const data = await res.json();
      setIsMongoConnected(data.isMongoConfigured);

      if (data.user) {
        setUser(data.user);
        setIsAuthOpen(false);
      } else {
        setIsAuthOpen(true);
      }
    } catch {
      setIsAuthOpen(true);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Fetch accounts with active filters
  const fetchAccounts = useCallback(async (overrideUser?: SessionUser | null) => {
    const activeUser = overrideUser !== undefined ? overrideUser : user;
    if (!activeUser) return;
    setLoading(true);

    try {
      const queryParams = new URLSearchParams({
        search: filters.search,
        levelTier: filters.levelTier,
        spenderStatus: filters.spenderStatus,
        team: filters.team,
        sortBy: filters.sortBy,
        page: String(filters.page),
        limit: String(filters.limit),
      });

      const headers = getAuthHeaders();
      const res = await fetch(`/api/accounts?${queryParams.toString()}`, { headers });
      if (res.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("poke_vault_token");
        }
        setIsAuthOpen(true);
        setUser(null);
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setAccounts(data.accounts || []);
        setTotalResults(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.metrics) setMetrics(data.metrics);
        if (data.source) setDataSource(data.source);
      }
    } catch { }
    finally {
      setLoading(false);
    }
  }, [user, filters]);

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user, fetchAccounts]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { }
    if (typeof window !== "undefined") {
      localStorage.removeItem("poke_vault_token");
    }
    setUser(null);
    setIsAuthOpen(true);
  };

  // Export Filtered Accounts as CSV
  const handleExportCsv = () => {
    if (accounts.length === 0) return;
    const header = "email,password,level,pokeCoins,stardust,itemBag,pokemonStorage,isFirstTimeBuyer,team,country\n";
    const rows = accounts
      .map((a) =>
        [
          a.email,
          a.password || "",
          a.level,
          a.pokeCoins || 0,
          a.stardust || 0,
          a.itemBag || "",
          a.pokemonStorage || "",
          a.isFirstTimeBuyer ?? "",
          a.team || "",
          a.country || "",
        ].join(",")
      )
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pokemon_vault_hits_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export Combos as email:password TXT
  const handleExportTxt = () => {
    if (accounts.length === 0) return;
    const lines = accounts.map((a) => `${a.email}:${a.password || ""}`).join("\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `combos_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen radial-glow flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#090a0f]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Status */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(124,92,255,0.2)]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-tight">VAULT EXTRACTOR</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono hidden md:block">
                Secure Account Intelligence & Verified Hits
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            {/* Database indicator */}
            <div
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border ${
                dataSource === "mongodb_atlas"
                  ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                  : "border-amber-500/20 bg-amber-500/5 text-amber-300"
              }`}
              title={
                dataSource === "mongodb_atlas"
                  ? "Connected to MongoDB Atlas"
                  : "Displaying local JSON fallback (MongoDB URI pending)"
              }
            >
              <Database className="w-3.5 h-3.5" />
              <span>{dataSource === "mongodb_atlas" ? "MongoDB Atlas" : "Local File View"}</span>
            </div>

            {/* Import Data button */}
            {user && (
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Import</span>
              </button>
            )}

            {/* Admin Users button */}
            {user && user.role === "admin" && (
              <button
                type="button"
                onClick={() => setIsAdminOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Access Control</span>
              </button>
            )}

            {/* Refresh button */}
            {user && (
              <button
                type="button"
                onClick={() => fetchAccounts()}
                disabled={loading}
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-400 hover:text-white transition-colors"
                title="Refresh accounts"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            )}

            {/* User Profile & Sign Out */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-medium text-zinc-200">{user.username}</p>
                  <p className="text-[10px] text-zinc-500 font-mono">{user.role}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-lg bg-white/[0.04] hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-white/[0.08] transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full flex flex-col">
        {/* Top Metrics Row */}
        <MetricsBar metrics={metrics} />

        {/* Filter & Search Toolbar */}
        <FilterToolbar
          filters={filters}
          onChange={(newFilters) => setFilters(newFilters)}
          onExportCsv={handleExportCsv}
          onExportTxt={handleExportTxt}
          totalResults={totalResults}
        />

        {/* View Mode Switcher */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1 p-1 bg-[#0a0c12] border border-white/[0.08] rounded-xl shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                viewMode === "cards"
                  ? "bg-white/[0.1] text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Vault Cards</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("telegram")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                viewMode === "telegram"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              <span>Telegram Live Feed</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500 font-mono">
            <span>Showing {accounts.length} of {totalResults.toLocaleString()} accounts</span>
          </div>
        </div>

        {/* View Switch: Telegram Live Feed vs Cards Grid */}
        {viewMode === "telegram" ? (
          <TelegramLiveFeed
            initialAccounts={accounts}
            filters={filters}
            totalResults={totalResults}
          />
        ) : (
          /* Accounts Card Grid */
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-64 rounded-xl border border-white/[0.05] bg-[#11131c]/50 animate-pulse p-5"
                  />
                ))}
              </div>
            ) : accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-white/[0.05] bg-[#11131c]/40 text-center my-6">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-zinc-500 mb-4">
                  <SlidersHorizontal className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-300">No matching accounts found</h3>
                <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4">
                  Adjust your filters or import existing results from your local extraction files or Telegram.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setFilters({
                      search: "",
                      levelTier: "all",
                      spenderStatus: "all",
                      team: "all",
                      sortBy: "newest",
                      page: 1,
                      limit: 24,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-xs font-medium text-zinc-300 transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {accounts.map((acc) => (
                    <AccountCard key={acc._id || acc.email} account={acc} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* Pagination Bar (Cards View Only - Telegram Feed is Infinite Stream) */}
        {viewMode === "cards" && totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/[0.06]">
            <span className="text-xs text-zinc-500">
              Page <span className="text-zinc-200 font-semibold">{filters.page}</span> of{" "}
              <span className="text-zinc-200 font-semibold">{totalPages}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={filters.page <= 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                disabled={filters.page >= totalPages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          setIsAuthOpen(false);
          fetchAccounts(loggedUser);
        }}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={() => {
          fetchAccounts();
        }}
      />

      <AdminUsersModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
    </main>
  );
}
