"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Radio,
  Volume2,
  VolumeX,
  Copy,
  Check,
  CheckCheck,
  ArrowDown,
  Shield,
  Coins,
  Sparkles,
  Package,
  Backpack,
  ShoppingCart,
  Send,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { ExtractedAccount, FilterOptions } from "@/lib/types";

interface TelegramLiveFeedProps {
  initialAccounts: ExtractedAccount[];
  filters: FilterOptions;
  totalResults: number;
}

export const TelegramLiveFeed: React.FC<TelegramLiveFeedProps> = ({
  initialAccounts,
  filters,
  totalResults,
}) => {
  // Feed messages list (displayed in chronological order: older at top, newer at bottom like Telegram)
  const [messages, setMessages] = useState<ExtractedAccount[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [newDropsCount, setNewDropsCount] = useState<number>(0);
  const [loadingOlder, setLoadingOlder] = useState<boolean>(false);
  const [hasMoreOlder, setHasMoreOlder] = useState<boolean>(true);
  const [olderPage, setOlderPage] = useState<number>(1);
  const [liveConnected, setLiveConnected] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastSeenTimestampRef = useRef<string>(new Date().toISOString());
  const seenAccountKeysRef = useRef<Set<string>>(new Set());

  // Web Audio Telegram-style chime synthesizer (A5 -> E6 chime)
  const playDropSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.07); // E6

      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch { }
  }, [soundEnabled]);

  // Sync initial accounts into chronological order (oldest to newest)
  useEffect(() => {
    if (initialAccounts.length > 0) {
      // Create copy and sort chronological (oldest to newest for chat flow)
      const sorted = [...initialAccounts].reverse();
      const seen = new Set<string>();
      sorted.forEach((a) => {
        const key = a._id || `${a.email}-${a.level}`;
        seen.add(key);
      });
      seenAccountKeysRef.current = seen;
      setMessages(sorted);

      // Track most recent timestamp
      const newest = initialAccounts[0];
      if (newest?.extractedAt) {
        lastSeenTimestampRef.current = newest.extractedAt;
      }
    }
  }, [initialAccounts]);

  // Handle incoming new hit
  const handleIncomingHit = useCallback((hit: ExtractedAccount) => {
    const key = hit._id || `${hit.email}-${hit.level}`;
    if (seenAccountKeysRef.current.has(key)) return;

    seenAccountKeysRef.current.add(key);

    // Apply active filters client-side
    if (filters.search) {
      const s = filters.search.toLowerCase();
      const match =
        hit.email.toLowerCase().includes(s) ||
        (hit.gameEmail && hit.gameEmail.toLowerCase().includes(s)) ||
        (hit.country && hit.country.toLowerCase().includes(s));
      if (!match) return;
    }

    const numLvl = Number(hit.level);
    const isNum = !isNaN(numLvl);
    if (filters.levelTier === "50" && numLvl < 50) return;
    if (filters.levelTier === "40" && numLvl < 40) return;
    if (filters.levelTier === "30" && numLvl < 30) return;
    if (filters.levelTier === "failed" && isNum) return;

    if (filters.spenderStatus === "spenders" && hit.isFirstTimeBuyer !== false) return;
    if (filters.spenderStatus === "first_time" && hit.isFirstTimeBuyer !== true) return;

    if (filters.team !== "all") {
      const t = String(hit.team || "").toLowerCase();
      if (filters.team === "none" && t !== "none" && t !== "0" && t !== "") return;
      if (filters.team !== "none" && !t.includes(filters.team)) return;
    }

    // Append new hit to the bottom of the group chat
    setMessages((prev) => [...prev, hit]);
    playDropSound();

    if (autoScroll) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } else {
      setNewDropsCount((prev) => prev + 1);
    }

    if (hit.extractedAt) {
      lastSeenTimestampRef.current = hit.extractedAt;
    }
  }, [filters, autoScroll, playDropSound]);

  // Real-time EventSource connection (SSE) + fast poll fallback
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let fallbackPoll: NodeJS.Timeout | null = null;

    const token = typeof window !== "undefined" ? localStorage.getItem("poke_vault_token") : null;
    const sseUrl = token ? `/api/accounts/live?token=${encodeURIComponent(token)}` : "/api/accounts/live";

    try {
      eventSource = new EventSource(sseUrl);

      eventSource.addEventListener("hit", (e) => {
        try {
          const hit = JSON.parse(e.data);
          handleIncomingHit(hit);
        } catch { }
      });

      eventSource.onopen = () => {
        setLiveConnected(true);
      };

      eventSource.onerror = () => {
        setLiveConnected(false);
      };
    } catch {
      setLiveConnected(false);
    }

    // Fast polling fallback: checks for new hits every 2.5 seconds
    fallbackPoll = setInterval(async () => {
      try {
        const queryParams = new URLSearchParams({
          since: lastSeenTimestampRef.current,
          limit: "20",
          sortBy: "newest",
        });

        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`/api/accounts?${queryParams.toString()}`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.accounts) && data.accounts.length > 0) {
            // Accounts from API are newest first; reverse so they append in chronological order
            const incoming = [...data.accounts].reverse();
            incoming.forEach((acc) => handleIncomingHit(acc));
          }
        }
      } catch { }
    }, 2500);

    return () => {
      if (eventSource) eventSource.close();
      if (fallbackPoll) clearInterval(fallbackPoll);
    };
  }, [handleIncomingHit]);

  // Initial auto-scroll to the bottom of the group chat on mount
  useEffect(() => {
    if (messages.length > 0 && autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages.length, autoScroll]);

  // Load older drops when scrolling up (Infinite History)
  const handleLoadOlder = async () => {
    if (loadingOlder || !hasMoreOlder) return;
    setLoadingOlder(true);

    try {
      const nextPage = olderPage + 1;
      const queryParams = new URLSearchParams({
        search: filters.search,
        levelTier: filters.levelTier,
        spenderStatus: filters.spenderStatus,
        team: filters.team,
        sortBy: "newest",
        page: String(nextPage),
        limit: "40",
      });

      const token = typeof window !== "undefined" ? localStorage.getItem("poke_vault_token") : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/accounts?${queryParams.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.accounts) && data.accounts.length > 0) {
          // Prepend older messages to the top
          const older = [...data.accounts].reverse();
          setMessages((prev) => [...older, ...prev]);
          setOlderPage(nextPage);
          if (data.accounts.length < 40) {
            setHasMoreOlder(false);
          }
        } else {
          setHasMoreOlder(false);
        }
      }
    } catch { }
    finally {
      setLoadingOlder(false);
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

    setAutoScroll(isAtBottom);
    if (isAtBottom) {
      setNewDropsCount(0);
    }

    // Trigger loading older messages when scrolled near top
    if (scrollTop < 80 && hasMoreOlder && !loadingOlder) {
      handleLoadOlder();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setAutoScroll(true);
    setNewDropsCount(0);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 2000);
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "Just now";
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    } catch {
      return "Just now";
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Today";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "Today";
    }
  };

  const getTeamBadge = (team?: string | number) => {
    const t = String(team || "").toLowerCase();
    if (t.includes("mystic") || t === "1" || t.includes("blue")) {
      return { name: "Mystic", color: "text-sky-400 bg-sky-500/10 border-sky-500/30" };
    }
    if (t.includes("valor") || t === "2" || t.includes("red")) {
      return { name: "Valor", color: "text-rose-400 bg-rose-500/10 border-rose-500/30" };
    }
    if (t.includes("instinct") || t === "3" || t.includes("yellow")) {
      return { name: "Instinct", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
    }
    return { name: "None", color: "text-zinc-400 bg-zinc-800/40 border-zinc-700/40" };
  };

  return (
    <div className="relative flex flex-col h-[780px] w-full rounded-2xl border border-white/[0.08] bg-[#0c1017] shadow-2xl overflow-hidden">
      {/* Telegram Group Chat Header */}
      <div className="px-4 py-3 bg-[#111722]/95 border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          {/* Channel Avatar */}
          <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-[0_0_15px_rgba(56,189,248,0.25)] border border-sky-400/30">
            <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0c1017]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">Pokemon Go Account Drops.</h2>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                GROUP CHAT
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 flex items-center gap-2">
              <span>{totalResults.toLocaleString()} verified drops</span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {liveConnected ? "Live Hit Streaming" : "Sync Active"}
              </span>
            </p>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2">
          {/* Sound Alert Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              soundEnabled
                ? "bg-indigo-500/15 border-indigo-500/35 text-indigo-300"
                : "bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-zinc-200"
            }`}
            title={soundEnabled ? "Mute notification sound" : "Enable notification sound on new drops"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-indigo-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{soundEnabled ? "Sound ON" : "Sound OFF"}</span>
          </button>

          {/* Auto-Scroll Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !autoScroll;
              setAutoScroll(next);
              if (next) scrollToBottom();
            }}
            className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
              autoScroll
                ? "bg-sky-500/15 border-sky-500/35 text-sky-300"
                : "bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-zinc-200"
            }`}
            title={autoScroll ? "Auto-scroll is locked to new drops" : "Auto-scroll is paused"}
          >
            <ArrowDown className={`w-3.5 h-3.5 ${autoScroll ? "text-sky-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Telegram Message Stream Viewport */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-[#0c1017] via-[#0e141f] to-[#0c1017] scroll-smooth"
      >
        {/* Load Older Drops Banner at Top */}
        <div className="flex justify-center pb-2">
          {hasMoreOlder ? (
            <button
              type="button"
              onClick={handleLoadOlder}
              disabled={loadingOlder}
              className="px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loadingOlder ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
              )}
              <span>{loadingOlder ? "Loading older drops..." : "Load Older Drops"}</span>
            </button>
          ) : (
            <span className="text-[11px] text-zinc-600 font-mono">Beginning of group drop history</span>
          )}
        </div>

        {/* Telegram Messages List */}
        {messages.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-8">
            <MessageSquare className="w-10 h-10 text-zinc-600 mb-3" />
            <p className="text-sm font-medium text-zinc-300">No account drops match current filter</p>
            <p className="text-xs text-zinc-500 mt-1">Listening for new account hits in real time...</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((account, idx) => {
              const numLevel = Number(account.level);
              const isNumeric = !isNaN(numLevel);
              const team = getTeamBadge(account.team);
              const comboStr = `${account.email}:${account.password || ""}`;
              const isLvl50 = isNumeric && numLevel >= 50;
              const isLvl40 = isNumeric && numLevel >= 40 && numLevel < 50;
              const isSpender = account.isFirstTimeBuyer === false;

              return (
                <motion.div
                  key={account._id || `${account.email}-${idx}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex justify-start max-w-2xl"
                >
                  {/* Telegram Message Bubble */}
                  <div
                    className={`relative w-full rounded-2xl p-4 transition-all border ${
                      isLvl50
                        ? "bg-[#182333] border-amber-500/35 shadow-[0_4px_24px_rgba(245,158,11,0.08)]"
                        : isLvl40
                        ? "bg-[#182333] border-rose-500/35 shadow-[0_4px_24px_rgba(244,63,94,0.08)]"
                        : "bg-[#151c27] border-white/[0.07] hover:border-white/[0.14]"
                    }`}
                  >
                    {/* Bot Header Line */}
                    <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-sky-400">Pokemon Go Account Drops.</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-white/[0.06] text-zinc-400">
                          BOT
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
                        <span>{formatDate(account.extractedAt)}</span>
                        <span>{formatTime(account.extractedAt)}</span>
                      </div>
                    </div>

                    {/* Headline Banner */}
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          isLvl50
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                            : isLvl40
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                            : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>
                          {isLvl50
                            ? `POKÉMON GO — LEVEL ${numLevel} HIT`
                            : isLvl40
                            ? `POKÉMON GO — HIGH LEVEL HIT (LVL ${numLevel})`
                            : isNumeric
                            ? `POKÉMON GO — LEVEL ${numLevel} HIT`
                            : "POKÉMON GO — ACCOUNT RESULT"}
                        </span>
                      </div>

                      {isSpender && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-red-500/15 border border-red-500/35 text-red-300">
                          <ShoppingCart className="w-3 h-3" />
                          PRIOR SPENDER
                        </span>
                      )}
                    </div>

                    {/* Monospace Credentials Box */}
                    <div className="space-y-1.5 p-3 rounded-xl bg-[#0d121a] border border-white/[0.05] mb-3 font-mono text-xs">
                      <div className="flex items-center justify-between group">
                        <span className="text-zinc-500 text-[11px]">Combo:</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(comboStr, `combo-${account.email}-${idx}`)}
                          className="flex items-center gap-1.5 text-zinc-200 hover:text-sky-300 transition-colors"
                          title="Click to copy combo"
                        >
                          <code className="bg-white/[0.04] px-2 py-0.5 rounded text-sky-300 font-semibold truncate max-w-[280px] sm:max-w-[420px]">
                            {comboStr}
                          </code>
                          {copiedId === `combo-${account.email}-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-zinc-500 group-hover:text-sky-400 shrink-0" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 text-[11px]">User:</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(account.email, `user-${account.email}-${idx}`)}
                          className="text-zinc-300 hover:text-white transition-colors"
                        >
                          <code>{account.email}</code>
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 text-[11px]">Pass:</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(account.password || "", `pass-${account.email}-${idx}`)}
                          className="text-zinc-300 hover:text-white transition-colors"
                        >
                          <code>{account.password || "(none)"}</code>
                        </button>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
                      {/* Level */}
                      <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <p className="text-[10px] text-zinc-500 font-medium uppercase">Level</p>
                        <p className="font-bold text-zinc-100 mt-0.5">
                          {isNumeric ? `Level ${numLevel}` : String(account.level || "Unknown")}
                        </p>
                      </div>

                      {/* Team */}
                      <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <p className="text-[10px] text-zinc-500 font-medium uppercase">Team</p>
                        <p className={`font-semibold mt-0.5 ${team.color.split(" ")[0]}`}>
                          {team.name}
                        </p>
                      </div>

                      {/* PokéCoins */}
                      <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <p className="text-[10px] text-zinc-500 font-medium uppercase">PokéCoins</p>
                        <p className="font-semibold text-amber-300 font-mono mt-0.5 flex items-center gap-1">
                          <Coins className="w-3 h-3 text-amber-400 shrink-0" />
                          {(account.pokeCoins ?? 0).toLocaleString()}
                        </p>
                      </div>

                      {/* Stardust */}
                      <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <p className="text-[10px] text-zinc-500 font-medium uppercase">Stardust</p>
                        <p className="font-semibold text-indigo-300 font-mono mt-0.5 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                          {(account.stardust ?? 0).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Secondary Details & Checkmarks */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.05] text-[11px] text-zinc-400 font-mono">
                      <div className="flex items-center gap-3">
                        {account.itemBag && (
                          <span className="flex items-center gap-1 text-zinc-400">
                            <Backpack className="w-3 h-3 text-zinc-500" />
                            Bag: {account.itemBag}
                          </span>
                        )}
                        {account.pokemonStorage && (
                          <span className="flex items-center gap-1 text-zinc-400">
                            <Package className="w-3 h-3 text-zinc-500" />
                            Storage: {account.pokemonStorage}
                          </span>
                        )}
                        {account.country && (
                          <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-300">
                            {account.country}
                          </span>
                        )}
                      </div>

                      {/* Blue double checkmarks */}
                      <div className="flex items-center gap-1 text-[#539eec]">
                        <span>{formatTime(account.extractedAt)}</span>
                        <CheckCheck className="w-3.5 h-3.5 text-[#539eec]" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Jump to Bottom Button with New Hit Indicator */}
      {!autoScroll && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-6 right-6 px-4 py-2.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-2xl flex items-center gap-2 transition-all border border-sky-400/40 z-20"
          title="Jump to latest drops"
        >
          <ArrowDown className="w-4 h-4" />
          <span className="text-xs font-semibold">
            {newDropsCount > 0 ? `${newDropsCount} new drop${newDropsCount > 1 ? "s" : ""}` : "Latest"}
          </span>
          {newDropsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>
      )}
    </div>
  );
};
