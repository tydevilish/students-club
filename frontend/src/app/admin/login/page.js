"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, User, ArrowRight, AlertCircle } from "lucide-react";
import api from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !password) {
      setError("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/api/auth/login", { username, password });
      localStorage.setItem("admin_token", res.data.token);
      router.push("/admin");
    } catch (err) {
      setError(err.response?.data?.error || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-800 relative overflow-hidden flex items-center justify-center p-4">
      <div
        className="absolute rounded-full bg-white/10 pointer-events-none"
        style={{ top: -100, right: -100, width: 300, height: 300 }}
      />
      <div
        className="absolute rounded-full bg-white/10 pointer-events-none"
        style={{ bottom: -50, left: -50, width: 200, height: 200 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-white rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-8 max-w-sm w-full md:p-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">
            เข้าสู่ระบบแอดมิน
          </h1>
          <p className="text-gray-500 text-sm mt-1">ระบบจัดการชมรม</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-1">
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              ชื่อผู้ใช้
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                className="w-full py-3 pr-4 pl-10 border-2 border-gray-200 rounded-xl transition-colors duration-200 focus:border-red-600 focus:outline-none focus:ring-3 focus:ring-red-600/20"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              รหัสผ่าน
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full py-3 pr-4 pl-10 border-2 border-gray-200 rounded-xl transition-colors duration-200 focus:border-red-600 focus:outline-none focus:ring-3 focus:ring-red-600/20"
              />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-red-50 text-red-600 py-3 px-4 rounded-xl text-sm mb-4"
            >
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </motion.div>
          )}

          <button
            id="admin-login-btn"
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-br from-red-600 to-red-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full"
          >
            {loading ? (
              <div className="border-2 border-solid border-white/30 border-t-white rounded-full w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>เข้าสู่ระบบ</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-primary-600 transition-colors"
          >
            ← กลับหน้าลงทะเบียน
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
