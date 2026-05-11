"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, BookOpen, ClipboardList, TrendingUp, Activity } from "lucide-react";
import api from "@/lib/api";
import getSocket from "@/lib/socket";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/api/settings/stats");
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchStats());
    const socket = getSocket();
    socket.on("club:updated", () => fetchStats());
    socket.on("registration:new", () => fetchStats());
    socket.on("registration:removed", () => fetchStats());
    return () => {
      socket.off("club:updated");
      socket.off("registration:new");
      socket.off("registration:removed");
    };
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="border-[3px] border-solid border-red-200 border-t-red-600 rounded-full w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: "นักศึกษาทั้งหมด", value: stats.totalStudents, icon: Users, color: "bg-blue-500" },
    { label: "ชมรมทั้งหมด", value: stats.totalClubs, icon: BookOpen, color: "bg-green-500" },
    { label: "ลงทะเบียนแล้ว", value: stats.totalRegistrations, icon: ClipboardList, color: "bg-primary-600" },
    { label: "อัตราลงทะเบียน", value: `${stats.registrationRate}%`, icon: TrendingUp, color: "bg-orange-500" },
  ];

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl border border-gray-200/80 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-600/15"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <Activity className="w-4 h-4 text-green-400 animate-pulse" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{card.value}</p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Club Stats Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl border border-gray-200/80 p-6 lg:p-8"
      >
        <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary-600" />
          สถิติสมาชิกชมรม
        </h2>
        <div className="space-y-4">
          {stats.clubStats.map((club, i) => {
            const pct = club.max_members > 0
              ? Math.round((club.current_members / club.max_members) * 100)
              : 0;
            return (
              <motion.div
                key={club.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{club.name}</span>
                  <span className={`text-sm font-semibold ${pct >= 100 ? "text-red-500" : pct >= 80 ? "text-orange-500" : "text-primary-600"
                    }`}>
                    {club.current_members}/{club.max_members}
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-orange-400" : "bg-primary-500"
                      }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(pct, 100)}%` }}
                    transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
