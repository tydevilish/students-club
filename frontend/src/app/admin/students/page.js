"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Edit2, Trash2, X, AlertCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";

const LEVELS = ["ปวช.1", "ปวช.2", "ปวช.3", "ปวส.1", "ปวส.2"];
const PREFIXES = ["นาย", "นางสาว", "นาง"];

export default function AdminStudentsPage() {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState({ student_id: "", prefix: "นาย", first_name: "", last_name: "", level: "ปวช.1" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { fetchStudents(); }, [page, search]);

  async function fetchStudents() {
    setLoading(true);
    try {
      const res = await api.get(`/api/students?page=${page}&limit=15&search=${search}`);
      setStudents(res.data.students);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      toast.error("โหลดข้อมูลล้มเหลว");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingStudent(null);
    setForm({ student_id: "", prefix: "นาย", first_name: "", last_name: "", level: "ปวช.1" });
    setFormError("");
    setShowModal(true);
  }

  function openEditModal(student) {
    setEditingStudent(student);
    setForm({
      student_id: student.student_id,
      prefix: student.prefix,
      first_name: student.first_name,
      last_name: student.last_name,
      level: student.level,
    });
    setFormError("");
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.student_id || !form.first_name || !form.last_name) {
      setFormError("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    if (!/^\d{11}$/.test(form.student_id)) {
      setFormError("รหัสนักศึกษาต้องเป็นตัวเลข 11 หลัก");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      if (editingStudent) {
        await api.put(`/api/students/${editingStudent.id}`, form);
        toast.success("แก้ไขสำเร็จ");
      } else {
        await api.post("/api/students", form);
        toast.success("เพิ่มนักศึกษาสำเร็จ");
      }
      setShowModal(false);
      fetchStudents();
    } catch (err) {
      setFormError(err.response?.data?.error || "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/api/students/${id}`);
      toast.success("ลบสำเร็จ");
      setDeleteConfirm(null);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.error || "ลบไม่สำเร็จ");
    }
  }

  return (
    <div>
      <Toaster position="top-right" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">จัดการนักศึกษา</h2>
          <p className="text-sm text-gray-500">ทั้งหมด {total} คน</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-gradient-to-br from-red-600 to-red-800 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-all text-sm"
        >
          <Plus className="w-4 h-4" /> เพิ่มนักศึกษา
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="ค้นหา รหัส, ชื่อ, นามสกุล..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-primary-600 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">รหัสนักศึกษา</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">ชื่อ-นามสกุล</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">ระดับชั้น</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">ชมรม</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600 w-24">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10">
                    <Loader2 className="w-6 h-6 text-primary-600 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">ไม่พบข้อมูล</td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="border-t border-gray-50 hover:bg-red-50">
                    <td className="px-4 py-3 font-mono text-gray-800">{s.student_id}</td>
                    <td className="px-4 py-3 text-gray-800">{s.prefix}{s.first_name} {s.last_name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.level}</td>
                    <td className="px-4 py-3">
                      {s.club_name ? (
                        <span className="text-primary-600 bg-primary-50 px-2 py-1 rounded-lg text-xs font-medium">{s.club_name}</span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEditModal(s)} className="p-2 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirm(s)} className="p-2 hover:bg-red-50 text-red-400 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">หน้า {page}/{totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1} className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages} className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-800">{editingStudent ? "แก้ไขนักศึกษา" : "เพิ่มนักศึกษา"}</h3>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">รหัสนักศึกษา (11 หลัก)</label>
                  <input type="text" inputMode="numeric" maxLength={11} value={form.student_id} onChange={e => setForm({...form, student_id: e.target.value.replace(/\D/g, "")})} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm tracking-wider" placeholder="กรอกรหัส 11 หลัก" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">คำนำหน้า</label>
                    <select value={form.prefix} onChange={e => setForm({...form, prefix: e.target.value})} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm">
                      {PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
                    <input type="text" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
                    <input type="text" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ระดับชั้น</label>
                  <select value={form.level} onChange={e => setForm({...form, level: e.target.value})} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm">
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                {formError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-xl text-sm">
                    <AlertCircle className="w-4 h-4" /> <span>{formError}</span>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50">ยกเลิก</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-gradient-to-br from-red-600 to-red-800 text-white rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingStudent ? "บันทึก" : "เพิ่ม"}
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
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">ยืนยันการลบ</h3>
              <p className="text-gray-500 text-sm mb-6">ต้องการลบ {deleteConfirm.prefix}{deleteConfirm.first_name} {deleteConfirm.last_name}?</p>
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
