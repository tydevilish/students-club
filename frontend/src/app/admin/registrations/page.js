"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Loader2, Filter, ClipboardList, Plus, Search, X, AlertCircle, ChevronRight, Users } from "lucide-react";
import api from "@/lib/api";
import getSocket from "@/lib/socket";
import toast, { Toaster } from "react-hot-toast";

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // ── Add registration modal state ──────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [step, setStep] = useState(1); // 1 = เลือกนักศึกษา, 2 = เลือกชมรม
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedClubForAdd, setSelectedClubForAdd] = useState("");
  const [addError, setAddError] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const debounceRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────

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

  // ── Add modal handlers ────────────────────────────────────────────
  function openAddModal() {
    setShowAddModal(true);
    setStep(1);
    setStudentSearch("");
    setStudentResults([]);
    setSelectedStudent(null);
    setSelectedClubForAdd("");
    setAddError("");
  }

  function closeAddModal() {
    setShowAddModal(false);
  }

  // Debounce search students (status=unregistered only)
  function handleStudentSearch(value) {
    setStudentSearch(value);
    setAddError("");
    clearTimeout(debounceRef.current);
    if (!value.trim()) { setStudentResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.get(`/api/students?page=1&limit=10&search=${value}&status=unregistered`);
        setStudentResults(res.data.students || []);
      } catch {
        setStudentResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
  }

  function selectStudent(student) {
    setSelectedStudent(student);
    setStep(2);
    setSelectedClubForAdd("");
    setAddError("");
  }

  async function handleAddSubmit() {
    if (!selectedStudent || !selectedClubForAdd) {
      setAddError("กรุณาเลือกชมรม");
      return;
    }
    setAddSubmitting(true);
    setAddError("");
    try {
      await api.post("/api/registrations/admin", {
        student_id: selectedStudent.id,
        club_id: parseInt(selectedClubForAdd),
      });
      toast.success(`ลงทะเบียน ${selectedStudent.prefix}${selectedStudent.first_name} สำเร็จ`);
      closeAddModal();
      fetchRegistrations();
    } catch (err) {
      setAddError(err.response?.data?.error || "เกิดข้อผิดพลาด");
    } finally {
      setAddSubmitting(false);
    }
  }
  // ─────────────────────────────────────────────────────────────────

  const activeClubs = clubs.filter(c => c.is_active && c.current_members < c.max_members);

  return (
    <div>
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">การลงทะเบียน</h2>
          <p className="text-sm text-gray-500">ทั้งหมด {registrations.length} รายการ</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter by club */}
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={selectedClub}
            onChange={(e) => setSelectedClub(e.target.value)}
            className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-primary-600"
          >
            <option value="">ทุกชมรม</option>
            {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {/* Add registration button */}
          <button
            onClick={openAddModal}
            className="bg-gradient-to-br from-red-600 to-red-800 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-all text-sm"
          >
            <Plus className="w-4 h-4" /> เพิ่มรายการ
          </button>
        </div>
      </div>

      {/* Table */}
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

      {/* ── Add Registration Modal ────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeAddModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">เพิ่มการลงทะเบียน</h3>
                  {/* Step indicator */}
                  <div className="flex items-center gap-1 mt-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${step >= 1 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'}`}>
                      1 เลือกนักศึกษา
                    </span>
                    <ChevronRight className="w-3 h-3 text-gray-300" />
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${step >= 2 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'}`}>
                      2 เลือกชมรม
                    </span>
                  </div>
                </div>
                <button onClick={closeAddModal} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── Step 1: Search student ── */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">ค้นหาเฉพาะนักศึกษาที่<span className="font-semibold text-amber-600">ยังไม่ได้ลงชมรม</span></p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="รหัสนักศึกษา, ชื่อ, นามสกุล..."
                      value={studentSearch}
                      onChange={e => handleStudentSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-primary-600 transition-colors"
                    />
                    {searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
                  </div>

                  {/* Results */}
                  <div className="max-h-64 overflow-y-auto space-y-1 -mx-1 px-1">
                    {!studentSearch.trim() ? (
                      <p className="text-center text-gray-400 text-sm py-8">พิมพ์ชื่อหรือรหัสเพื่อค้นหา</p>
                    ) : studentResults.length === 0 && !searchLoading ? (
                      <p className="text-center text-gray-400 text-sm py-8">ไม่พบนักศึกษา หรือลงชมรมแล้วทั้งหมด</p>
                    ) : (
                      studentResults.map(s => (
                        <button
                          key={s.id}
                          onClick={() => selectStudent(s)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors text-left group"
                        >
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {s.first_name?.[0] ?? '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{s.prefix}{s.first_name} {s.last_name}</p>
                            <p className="text-xs text-gray-400 font-mono">{s.student_id} · {s.level}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-red-400 transition-colors flex-shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ── Step 2: Select club ── */}
              {step === 2 && selectedStudent && (
                <div className="space-y-4">
                  {/* Selected student summary */}
                  <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold flex-shrink-0">
                      {selectedStudent.first_name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{selectedStudent.prefix}{selectedStudent.first_name} {selectedStudent.last_name}</p>
                      <p className="text-xs text-gray-400 font-mono">{selectedStudent.student_id} · {selectedStudent.level}</p>
                    </div>
                    <button onClick={() => { setStep(1); setSelectedStudent(null); }} className="text-xs text-red-500 hover:underline">เปลี่ยน</button>
                  </div>

                  {/* Club selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                      <Users className="w-4 h-4" /> เลือกชมรม
                    </label>
                    <div className="space-y-2 max-h-52 overflow-y-auto -mx-1 px-1">
                      {activeClubs.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">ไม่มีชมรมที่รับสมัคร</p>
                      ) : activeClubs.map(c => {
                        const pct = Math.round((c.current_members / c.max_members) * 100);
                        const isFull = c.current_members >= c.max_members;
                        return (
                          <button
                            key={c.id}
                            disabled={isFull}
                            onClick={() => setSelectedClubForAdd(String(c.id))}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                              selectedClubForAdd === String(c.id)
                                ? 'border-red-500 bg-red-50'
                                : isFull
                                  ? 'border-gray-100 opacity-40 cursor-not-allowed'
                                  : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${pct >= 80 ? 'bg-orange-400' : 'bg-emerald-400'}`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-medium ${isFull ? 'text-red-500' : 'text-gray-500'}`}>
                                  {c.current_members}/{c.max_members}
                                </span>
                              </div>
                            </div>
                            {selectedClubForAdd === String(c.id) && (
                              <div className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {addError && (
                    <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-xl text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" /> <span>{addError}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => { setStep(1); setAddError(""); }}
                      className="flex-1 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:bg-gray-50"
                    >
                      ย้อนกลับ
                    </button>
                    <button
                      onClick={handleAddSubmit}
                      disabled={addSubmitting || !selectedClubForAdd}
                      className="flex-1 py-2.5 bg-gradient-to-br from-red-600 to-red-800 text-white rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {addSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      ยืนยันลงทะเบียน
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center" onClick={e => e.stopPropagation()}>
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-7 h-7 text-red-500" /></div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">ยกเลิกลงทะเบียน</h3>
              <p className="text-gray-500 text-sm mb-6">ต้องการยกเลิกลงทะเบียน<br />{deleteConfirm.prefix}{deleteConfirm.first_name} จากชมรม {deleteConfirm.club_name}?</p>
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
