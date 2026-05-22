// FULL REWRITE
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, Save, Loader2, Clock, Power,
  Database, Users, Trash2, UserPlus, Shield, X
} from "lucide-react";
import api from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({ registration_open: "true", registration_deadline: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New States for SQL Export and Access Control
  const [admins, setAdmins] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantForm, setGrantForm] = useState({ username: "", password: "", confirmPassword: "" });
  const [granting, setGranting] = useState(false);
  const [grantError, setGrantError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await api.get("/api/settings/admins");
      setAdmins(res.data);
    } catch {
      toast.error("โหลดข้อมูลผู้ดูแลระบบล้มเหลว");
    }
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await api.get("/api/auth/me");
      setCurrentUser(res.data.admin);
    } catch {
      // Handled silently since layout handles auth redirects
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get("/api/settings");
      setSettings({
        registration_open: res.data.registration_open || "true",
        registration_deadline: res.data.registration_deadline || "",
      });
      await fetchAdmins();
      await fetchCurrentUser();
    } catch {
      toast.error("โหลดการตั้งค่าล้มเหลว");
    } finally { setLoading(false); }
  }, [fetchAdmins, fetchCurrentUser]);

  useEffect(() => { Promise.resolve().then(() => fetchSettings()); }, [fetchSettings]);

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

  async function handleExportSql() {
    setExporting(true);
    try {
      const res = await api.get("/api/settings/export-sql", { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/sql" }));
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `backup_db_${date}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("ส่งออกข้อมูล SQL สำเร็จ");
    } catch {
      toast.error("ส่งออกข้อมูล SQL ล้มเหลว");
    } finally {
      setExporting(false);
    }
  }

  async function handleGrantAccess(e) {
    e.preventDefault();
    setGrantError("");

    if (grantForm.username.trim().length < 3) {
      setGrantError("Username ต้องมีอย่างน้อย 3 ตัวอักษร");
      return;
    }
    if (grantForm.password.length < 6) {
      setGrantError("Password ต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (grantForm.password !== grantForm.confirmPassword) {
      setGrantError("รหัสผ่านไม่ตรงกัน");
      return;
    }

    setGranting(true);
    try {
      await api.post("/api/settings/admins", {
        username: grantForm.username,
        password: grantForm.password,
      });
      toast.success("ให้สิทธิ์ผู้ดูแลระบบสำเร็จ");
      setGrantForm({ username: "", password: "", confirmPassword: "" });
      setShowGrantModal(false);
      await fetchAdmins();
    } catch (err) {
      setGrantError(err.response?.data?.error || "เกิดข้อผิดพลาดในการให้สิทธิ์");
    } finally {
      setGranting(false);
    }
  }

  async function handleRevokeAccess(id, username) {
    if (currentUser && String(currentUser.id) === String(id)) {
      toast.error("คุณไม่สามารถลบสิทธิ์ของตัวเองได้");
      return;
    }

    if (!confirm(`คุณต้องการถอนสิทธิ์ผู้ดูแลระบบของ "${username}" ใช่หรือไม่?`)) {
      return;
    }

    setDeletingId(id);
    try {
      await api.delete(`/api/settings/admins/${id}`);
      toast.success("ถอนสิทธิ์ผู้ดูแลระบบสำเร็จ");
      await fetchAdmins();
    } catch (err) {
      toast.error(err.response?.data?.error || "เกิดข้อผิดพลาดในการถอนสิทธิ์");
    } finally {
      setDeletingId(null);
    }
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
    <div className="max-w-5xl">
      <Toaster position="top-right" />
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary-600" />
        ตั้งค่าระบบ
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Registration Settings & DB Backup */}
        <div className="space-y-6">
          {/* Registration Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
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
            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-gray-800">เวลาปิดรับลงทะเบียน</h3>
            </div>
            <input
              type="datetime-local"
              value={toLocalDatetime(settings.registration_deadline)}
              onChange={(e) => setSettings({ ...settings, registration_deadline: e.target.value ? new Date(e.target.value).toISOString() : "" })}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-primary-600 transition-colors focus:outline-none"
            />
            {settings.registration_deadline && (
              <p className="text-xs text-gray-500 mt-2">
                กำหนดปิด: {new Date(settings.registration_deadline).toLocaleString("th-TH", { dateStyle: "full", timeStyle: "short" })}
              </p>
            )}
          </motion.div>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-gradient-to-br from-red-600 to-red-800 text-white font-semibold py-3.5 px-8 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-md shadow-red-900/10 cursor-pointer"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              บันทึกการตั้งค่าระบบ
            </button>
          </motion.div>

          {/* SQL Data Export */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <Database className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-gray-800">ส่งออกฐานข้อมูล SQL</h3>
            </div>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              สำรองข้อมูลของระบบทั้งหมด รวมถึงตารางนักศึกษา ตารางชมรม การลงทะเบียน และค่าตั้งค่าต่าง ๆ ออกมาเป็นไฟล์รูปแบบ SQL (.sql) เพื่อนำไปกู้คืนหรือใช้งานต่อ
            </p>
            <button
              onClick={handleExportSql}
              disabled={exporting}
              className="w-full py-3 border-2 border-dashed border-red-200 rounded-xl font-semibold text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              {exporting ? "กำลังส่งออก..." : "ส่งออกข้อมูลสำรอง (SQL)"}
            </button>
          </motion.div>
        </div>

        {/* Right Column: Access Control */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm h-full flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-gray-800">สิทธิ์การเข้าใช้งานระบบ</h3>
              </div>
              <button
                onClick={() => {
                  setGrantForm({ username: "", password: "", confirmPassword: "" });
                  setGrantError("");
                  setShowGrantModal(true);
                }}
                className="py-2 px-3.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                ให้สิทธิ์เข้าใช้งาน
              </button>
            </div>

            {/* List of Admins */}
            <div className="space-y-3 flex-1 overflow-auto max-h-[400px] pr-1">
              {admins.map((adm) => {
                const isMe = currentUser && String(currentUser.id) === String(adm.id);
                return (
                  <div
                    key={adm.id}
                    className="flex items-center justify-between p-4 border border-gray-50 rounded-xl hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${isMe ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {adm.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-gray-800">{adm.username}</p>
                          {isMe && (
                            <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-full">
                              บัญชีของคุณ
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          ให้สิทธิ์เมื่อ: {new Date(adm.created_at).toLocaleDateString("th-TH", { dateStyle: "medium" })}
                        </p>
                      </div>
                    </div>

                    {!isMe && (
                      <button
                        onClick={() => handleRevokeAccess(adm.id, adm.username)}
                        disabled={deletingId === adm.id}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                        title="ถอนสิทธิ์การเข้าใช้งาน"
                      >
                        {deletingId === adm.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Grant Access Modal */}
      <AnimatePresence>
        {showGrantModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGrantModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md p-6 overflow-hidden z-10"
            >
              <button
                onClick={() => setShowGrantModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary-600" />
                ให้สิทธิ์ผู้ดูแลระบบคนใหม่
              </h3>

              <form onSubmit={handleGrantAccess} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">ชื่อผู้ใช้งาน (Username)</label>
                  <input
                    type="text"
                    required
                    value={grantForm.username}
                    onChange={e => setGrantForm({ ...grantForm, username: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                    placeholder="อย่างน้อย 3 ตัวอักษร"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">รหัสผ่าน (Password)</label>
                  <input
                    type="password"
                    required
                    value={grantForm.password}
                    onChange={e => setGrantForm({ ...grantForm, password: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">ยืนยันรหัสผ่าน (Confirm Password)</label>
                  <input
                    type="password"
                    required
                    value={grantForm.confirmPassword}
                    onChange={e => setGrantForm({ ...grantForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                  />
                </div>

                {grantError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {grantError}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGrantModal(false)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={granting}
                    className="flex-1 py-2.5 bg-gradient-to-br from-red-600 to-red-800 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-red-900/10"
                  >
                    {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    ตกลง
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
