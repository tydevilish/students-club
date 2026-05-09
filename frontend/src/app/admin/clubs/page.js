"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, AlertCircle, Loader2, Users } from "lucide-react";
import api from "@/lib/api";
import getSocket from "@/lib/socket";
import toast, { Toaster } from "react-hot-toast";

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", max_members: 30 });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchClubs();
    const socket = getSocket();
    socket.on("club:updated", (updated) => {
      setClubs(prev => prev.map(c => c.id === updated.id ? updated : c));
    });
    return () => { socket.off("club:updated"); };
  }, []);

  async function fetchClubs() {
    try {
      const res = await api.get("/api/clubs");
      setClubs(res.data);
    } catch { toast.error("โหลดข้อมูลล้มเหลว"); }
    finally { setLoading(false); }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: "", description: "", max_members: 30 });
    setFormError("");
    setShowModal(true);
  }

  function openEdit(club) {
    setEditing(club);
    setForm({ name: club.name, description: club.description || "", max_members: club.max_members });
    setFormError("");
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) { setFormError("กรุณากรอกชื่อชมรม"); return; }
    setSubmitting(true);
    setFormError("");
    try {
      if (editing) {
        await api.put(`/api/clubs/${editing.id}`, form);
        toast.success("แก้ไขชมรมสำเร็จ");
      } else {
        await api.post("/api/clubs", form);
        toast.success("เพิ่มชมรมสำเร็จ");
      }
      setShowModal(false);
      fetchClubs();
    } catch (err) {
      setFormError(err.response?.data?.error || "เกิดข้อผิดพลาด");
    } finally { setSubmitting(false); }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/api/clubs/${id}`);
      toast.success("ลบชมรมสำเร็จ");
      setDeleteConfirm(null);
      fetchClubs();
    } catch (err) {
      toast.error(err.response?.data?.error || "ลบไม่สำเร็จ");
    }
  }

  return (
    <div>
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">จัดการชมรม</h2>
          <p className="text-sm text-gray-500">ทั้งหมด {clubs.length} ชมรม</p>
        </div>
        <button onClick={openCreate} className="bg-gradient-to-br from-red-600 to-red-800 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-all text-sm">
          <Plus className="w-4 h-4" /> เพิ่มชมรม
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary-600 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clubs.map((club, i) => {
            const pct = club.max_members > 0 ? Math.round((club.current_members / club.max_members) * 100) : 0;
            return (
              <motion.div
                key={club.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-600/15"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary-600" />
                    </div>
                    <h3 className="font-semibold text-gray-800 text-sm">{club.name}</h3>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(club)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteConfirm(club)} className="p-1.5 hover:bg-red-50 text-red-400 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                {club.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{club.description}</p>}
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-500">สมาชิก</span>
                  <span className={`font-semibold ${pct >= 100 ? "text-red-500" : "text-primary-600"}`}>{club.current_members}/{club.max_members}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-[width] duration-800 ease-[cubic-bezier(0.4,0,0.2,1)] ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-orange-400" : "bg-primary-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-800">{editing ? "แก้ไขชมรม" : "เพิ่มชมรม"}</h3>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อชมรม</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm" placeholder="ชื่อชมรม" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย</label>
                  <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm h-24 resize-none" placeholder="คำอธิบายชมรม (ไม่บังคับ)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนรับสูงสุด</label>
                  <input type="number" min={1} value={form.max_members} onChange={e => setForm({...form, max_members: parseInt(e.target.value) || 1})} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm" />
                </div>
                {formError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-xl text-sm"><AlertCircle className="w-4 h-4" /> {formError}</div>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm">ยกเลิก</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-gradient-to-br from-red-600 to-red-800 text-white rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "บันทึก" : "เพิ่ม"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center" onClick={e => e.stopPropagation()}>
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-7 h-7 text-red-500" /></div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">ยืนยันการลบ</h3>
              <p className="text-gray-500 text-sm mb-6">ต้องการลบชมรม &quot;{deleteConfirm.name}&quot;?<br/><span className="text-red-500 text-xs">สมาชิกทั้งหมดจะถูกยกเลิกลงทะเบียน</span></p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm">ยกเลิก</button>
                <button onClick={() => handleDelete(deleteConfirm.id)} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium text-sm hover:bg-red-600">ลบ</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
