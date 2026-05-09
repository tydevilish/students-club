"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Save, Loader2, Clock, Power } from "lucide-react";
import api from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({ registration_open: "true", registration_deadline: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  async function fetchSettings() {
    try {
      const res = await api.get("/api/settings");
      setSettings({
        registration_open: res.data.registration_open || "true",
        registration_deadline: res.data.registration_deadline || "",
      });
    } catch {
      toast.error("โหลดการตั้งค่าล้มเหลว");
    } finally { setLoading(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.put("/api/settings", {
        registration_open: settings.registration_open,
        registration_deadline: settings.registration_deadline,
      });
      toast.success("บันทึกสำเร็จ");
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    } finally { setSaving(false); }
  }

  // Convert UTC datetime to local datetime-local format for input
  function toLocalDatetime(dtStr) {
    if (!dtStr) return "";
    try {
      const d = new Date(dtStr);
      const offset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - offset * 60000);
      return local.toISOString().slice(0, 16);
    } catch { return ""; }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary-600 animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl">
      <Toaster position="top-right" />
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary-600" />
        ตั้งค่าระบบ
      </h2>

      <div className="space-y-6">
        {/* Registration Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-100 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Power className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-800">สถานะระบบลงทะเบียน</h3>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSettings({ ...settings, registration_open: "true" })}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all border-2 ${settings.registration_open === "true"
                ? "bg-green-50 border-green-500 text-green-700"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
            >
              <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${settings.registration_open === "true" ? "bg-green-500 animate-pulse" : "bg-gray-300"
                }`} />
              เปิดรับลงทะเบียน
            </button>
            <button
              onClick={() => setSettings({ ...settings, registration_open: "false" })}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all border-2 ${settings.registration_open === "false"
                ? "bg-red-50 border-red-500 text-red-700"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
            >
              <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${settings.registration_open === "false" ? "bg-red-500" : "bg-gray-300"
                }`} />
              ปิดรับลงทะเบียน
            </button>
          </div>
        </motion.div>

        {/* Deadline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-100 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-800">เวลาปิดรับลงทะเบียน</h3>
          </div>
          <input
            type="datetime-local"
            value={toLocalDatetime(settings.registration_deadline)}
            onChange={(e) => setSettings({ ...settings, registration_deadline: e.target.value ? new Date(e.target.value).toISOString() : "" })}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-primary-600 transition-colors"
          />
          {settings.registration_deadline && (
            <p className="text-xs text-gray-500 mt-2">
              กำหนดปิด: {new Date(settings.registration_deadline).toLocaleString("th-TH", { dateStyle: "full", timeStyle: "short" })}
            </p>
          )}
        </motion.div>

        {/* Save */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-br from-red-600 to-red-800 text-white font-semibold py-3 px-8 rounded-xl flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            บันทึกการตั้งค่า
          </button>
        </motion.div>
      </div>
    </div>
  );
}
