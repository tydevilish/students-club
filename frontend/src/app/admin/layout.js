"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, BookOpen, ClipboardList, Settings,
  LogOut, Menu, X, GraduationCap, ChevronRight
} from "lucide-react";
import api from "@/lib/api";

const navItems = [
  { href: "/admin", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/admin/students", label: "นักศึกษา", icon: Users },
  { href: "/admin/clubs", label: "ชมรม", icon: BookOpen },
  { href: "/admin/registrations", label: "การลงทะเบียน", icon: ClipboardList },
  { href: "/admin/settings", label: "ตั้งค่า", icon: Settings },
];

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        router.push("/admin/login");
        return;
      }
      const res = await api.get("/api/auth/me");
      setAdmin(res.data.admin);
    } catch {
      localStorage.removeItem("admin_token");
      router.push("/admin/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (pathname === "/admin/login") return;
    if (!admin) {
      Promise.resolve().then(() => checkAuth());
    }
  }, [pathname, admin, checkAuth]);

  // Skip layout for login page
  if (pathname === "/admin/login") {
    return children;
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    router.push("/admin/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="border-[3px] border-solid border-red-200 border-t-red-600 rounded-full w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 transform transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800 text-sm">ระบบลงทะเบียนชมรม</h2>
                <p className="text-xs text-gray-400">แผนก IT</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive ? "bg-red-50 text-red-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="px-3 py-4 border-t border-gray-100">
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-sm">
                {admin.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{admin.username}</p>
                <p className="text-xs text-gray-400">Admin</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 mt-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-4 lg:px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="text-lg font-semibold text-gray-800">
            {navItems.find((item) => item.href === pathname)?.label || "แอดมิน"}
          </h1>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
