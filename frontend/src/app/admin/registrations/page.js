"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Loader2, Filter, ClipboardList } from "lucide-react";
import api from "@/lib/api";
import getSocket from "@/lib/socket";
import toast, { Toaster } from "react-hot-toast";

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchClubs = useCallback(async () => {
    try {
      const res = await api.get("/api/clubs");
      setClubs(res.data);
    } catch {}
  }, []);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedClub ? `/api/registrations?club_id=${selectedClub}` : "/api/registrations";
      const res = await api.get(url);
      setRegistrations(res.data);
    } catch { toast.error("โหลดข้อมูลล้มเหลว"); }
    finally { setLoading(false); }
  }, [selectedClub]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchClubs();
      fetchRegistrations();
    });
    const socket = getSocket();
    socket.on("registration:new", () => fetchRegistrations());
    socket.on("registration:removed", () => fetchRegistrations());
    return () => {
      socket.off("registration:new");
      socket.off("registration:removed");
    };
  }, [fetchClubs, fetchRegistrations]);

  useEffect(() => {
    if (selectedClub) {
      Promise.resolve().then(() => fetchRegistrations());
    }
  }, [selectedClub, fetchRegistrations]);

  async function handleDelete(id) {
    try {
      await api.delete(`/api/registrations/${id}`);
      toast.success("ยกเลิกลงทะเบียนสำเร็จ");
      setDeleteConfirm(null);
      fetchRegistrations();
    } catch (err) {
      toast.error(err.response?.data?.error || "เกิดข้อผิดพลาด");
    }
  }

  return (
    <div>
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">การลงทะเบียน</h2>
          <p className="text-sm text-gray-500">ทั้งหมด {registrations.length} รายการ</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={selectedClub}
            onChange={(e) => setSelectedClub(e.target.value)}
            className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-primary-600"
          >
            <option value="">ทุกชมรม</option>
            {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">รหัสนักศึกษา</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">ชื่อ-นามสกุล</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">ระดับชั้น</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">ชมรม</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">วันที่ลงทะเบียน</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 w-20">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10"><Loader2 className="w-6 h-6 text-primary-600 animate-spin mx-auto" /></td></tr>
              ) : registrations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400">ยังไม่มีการลงทะเบียน</p>
                  </td>
                </tr>
              ) : (
                registrations.map((r, i) => (
                  <tr key={r.id} className="border-t border-gray-50 table-row-hover">
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-gray-800">{r.student_id}</td>
                    <td className="px-4 py-3 text-gray-800">{r.prefix}{r.first_name} {r.last_name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.level}</td>
                    <td className="px-4 py-3"><span className="text-primary-600 bg-primary-50 px-2 py-1 rounded-lg text-xs font-medium">{r.club_name}</span></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.registered_at).toLocaleString("th-TH")}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setDeleteConfirm(r)} className="p-2 hover:bg-red-50 text-red-400 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center" onClick={e => e.stopPropagation()}>
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-7 h-7 text-red-500" /></div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">ยกเลิกลงทะเบียน</h3>
              <p className="text-gray-500 text-sm mb-6">ต้องการยกเลิกลงทะเบียน<br/>{deleteConfirm.prefix}{deleteConfirm.first_name} จากชมรม {deleteConfirm.club_name}?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm">ไม่</button>
                <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium text-sm hover:bg-red-600">ยืนยัน</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
