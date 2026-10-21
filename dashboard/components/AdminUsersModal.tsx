"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Users, Check, Ban, Trash2, RefreshCw } from "lucide-react";

interface UserItem {
  id: string;
  email: string;
  username: string;
  role: string;
  isApproved: boolean;
  createdAt: string;
}

interface AdminUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminUsersModal: React.FC<AdminUsersModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getAuthHeaders = (): Record<string, string> => {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("poke_vault_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch { }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleApprove = async (userId: string, currentStatus: boolean) => {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ userId, isApproved: !currentStatus }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isApproved: !currentStatus } : u))
        );
      }
    } catch { }
    finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this user?")) return;
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ userId, action: "delete" }),
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch { }
    finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl p-6 rounded-2xl border border-white/[0.08] bg-[#11131c] shadow-2xl relative max-h-[85vh] flex flex-col"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-500 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-between gap-3 mb-5 pr-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Access Control & Whitelist</h2>
              <p className="text-xs text-zinc-400">Manage approved operators and permissions</p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
            title="Refresh users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {users.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              {loading ? "Loading users..." : "No registered users in database yet."}
            </div>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                className="p-3 rounded-xl bg-[#0a0c12] border border-white/[0.05] flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-200">{u.email}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded border border-white/[0.08] text-zinc-400">
                      {u.role}
                    </span>
                    {u.isApproved ? (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Approved
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Pending Approval
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                    User: {u.username} • Joined: {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actionLoading === u.id}
                    onClick={() => handleToggleApprove(u.id, u.isApproved)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                      u.isApproved
                        ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                        : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    {u.isApproved ? (
                      <>
                        <Ban className="w-3.5 h-3.5" />
                        Revoke Access
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Grant Access
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={actionLoading === u.id}
                    onClick={() => handleDeleteUser(u.id)}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-white/[0.06] transition-colors"
                    title="Remove user"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};
