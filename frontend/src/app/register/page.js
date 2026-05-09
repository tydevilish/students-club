"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Check, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";
import getSocket from "@/lib/socket";

export default function RegisterPage() {
  const router = useRouter();
  const [student, setStudent] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("student");
    if (!stored) {
      router.push("/");
      return;
    }
    setStudent(JSON.parse(stored));
    fetchClubs();

    const socket = getSocket();
    socket.on("club:updated", (updatedClub) => {
      setClubs((prev) =>
        prev.map((c) => (c.id === updatedClub.id ? updatedClub : c))
      );
    });
    socket.on("club:deleted", ({ id }) => {
      setClubs((prev) => prev.filter((c) => c.id !== id));
    });

    return () => {
      socket.off("club:updated");
      socket.off("club:deleted");
    };
  }, [router]);

  async function fetchClubs() {
    try {
      const res = await api.get("/api/clubs");
      setClubs(res.data);
    } catch (err) {
      setError("ไม่สามารถโหลดข้อมูลชมรมได้");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!selectedClub || !student) return;
    setSubmitting(true);
    setError("");
    try {
      await api.post("/api/registrations", {
        student_id: student.id,
        club_id: selectedClub.id,
      });
      sessionStorage.setItem("registered_club", JSON.stringify(selectedClub));
      router.push("/register/success");
    } catch (err) {
      setError(err.response?.data?.error || "เกิดข้อผิดพลาด");
      setShowConfirm(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (!student) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-red-600 to-red-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">กลับหน้าหลัก</span>
          </button>
          <h1 className="text-2xl md:text-3xl font-bold">เลือกชมรม</h1>
          <p className="text-white/70 mt-1">
            {student.prefix}{student.first_name} {student.last_name} — {student.level}
          </p>
          <p className="text-white/50 text-sm mt-1">
            รหัส: {student.student_id}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : (
          <>
            <p className="text-gray-500 mb-6 text-sm">
              เลือกชมรมที่ต้องการลงทะเบียน (เลือกได้ 1 ชมรม)
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clubs.map((club, index) => {
                const isFull = club.current_members >= club.max_members;
                const isSelected = selectedClub?.id === club.id;
                const percentage = Math.round(
                  (club.current_members / club.max_members) * 100
                );

                return (
                  <motion.div
                    key={club.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => {
                      if (!isFull && !club.is_active === false) {
                        setSelectedClub(isSelected ? null : club);
                      }
                    }}
                    className={`relative bg-white rounded-2xl border-2 p-6 cursor-pointer transition-all duration-300 ${isFull
                        ? "opacity-60 cursor-not-allowed border-gray-200"
                        : isSelected
                          ? "border-primary-600 shadow-lg shadow-red-100 scale-[1.02]"
                          : "border-gray-100 hover:border-primary-300 hover:shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-red-600/15"
                      }`}
                  >
                    {/* Full badge */}
                    {isFull && (
                      <div className="absolute top-3 right-3 bg-gray-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        เต็ม
                      </div>
                    )}

                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 bg-primary-600 text-white rounded-full p-1">
                        <Check className="w-4 h-4" />
                      </div>
                    )}

                    <div className="flex items-start gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-primary-600 text-white" : "bg-primary-50 text-primary-600"
                        } transition-colors`}>
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 text-base leading-tight">
                          {club.name}
                        </h3>
                      </div>
                    </div>

                    {club.description && (
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                        {club.description}
                      </p>
                    )}

                    {/* Progress */}
                    <div className="mt-auto">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500">สมาชิก</span>
                        <span className={`font-semibold ${isFull ? "text-gray-500" : percentage >= 80 ? "text-orange-500" : "text-primary-600"
                          }`}>
                          {club.current_members}/{club.max_members}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full transition-[width] duration-800 ease-[cubic-bezier(0.4,0,0.2,1)] ${isFull
                              ? "bg-gray-400"
                              : percentage >= 80
                                ? "bg-orange-400"
                                : "bg-primary-600"
                            }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-10 flex justify-center"
            >
              <button
                id="register-btn"
                onClick={() => setShowConfirm(true)}
                disabled={!selectedClub}
                className="bg-gradient-to-br from-red-600 to-red-800 text-white font-semibold py-4 px-10 rounded-2xl flex items-center gap-3 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] text-lg shadow-lg shadow-red-200"
              >
                <Check className="w-6 h-6" />
                ยืนยันลงทะเบียน
              </button>
            </motion.div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && selectedClub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">ยืนยันลงทะเบียน</h3>
                <p className="text-gray-500 mb-6">
                  คุณต้องการลงทะเบียน<br />
                  <strong className="text-primary-600">{selectedClub.name}</strong>
                  <br />ใช่หรือไม่?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-3 px-4 border-2 border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                    disabled={submitting}
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleRegister}
                    disabled={submitting}
                    className="flex-1 py-3 px-4 bg-gradient-to-br from-red-600 to-red-800 text-white rounded-xl font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        ยืนยัน
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
