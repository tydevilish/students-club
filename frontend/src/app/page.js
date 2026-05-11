"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { GraduationCap, Users, Clock, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import getSocket from "@/lib/socket";

export default function HomePage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(null);

  async function fetchSettings() {
    try {
      const res = await api.get("/api/settings");
      setSettings(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => fetchSettings());
    const socket = getSocket();
    socket.on("settings:changed", (data) => {
      setSettings(data);
    });
    return () => {
      socket.off("settings:changed");
    };
  }, []);

  useEffect(() => {
    if (!settings?.registration_deadline) return;
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const deadline = new Date(settings.registration_deadline).getTime();
      const diff = deadline - now;
      if (diff <= 0) {
        setCountdown(null);
        clearInterval(timer);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown({ days, hours, minutes, seconds });
    }, 1000);
    return () => clearInterval(timer);
  }, [settings]);

  const isOpen = settings?.registration_open === "true";
  const deadline = settings?.registration_deadline ? new Date(settings.registration_deadline) : null;
  const isExpired = deadline && new Date() > deadline;
  const canRegister = isOpen && !isExpired;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setAlreadyRegistered(null);
    if (!/^\d{11}$/.test(studentId)) {
      setError("กรุณากรอกรหัสนักศึกษา 11 หลัก");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/api/students/verify", { student_id: studentId });
      const data = res.data;
      if (data.registration) {
        setAlreadyRegistered(data);
      } else if (!data.registration_open) {
        setError("ปิดรับลงทะเบียนแล้ว");
      } else {
        sessionStorage.setItem("student", JSON.stringify(data.student));
        router.push("/register");
      }
    } catch (err) {
      setError(err.response?.data?.error || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div
        className="relative overflow-hidden flex-1 flex flex-col items-center justify-center px-4 py-16"
        style={{ background: "linear-gradient(135deg, #DC2626 0%, #991B1B 100%)" }}
      >
        {/* Decorative circles */}
        <div className="absolute top-[-100px] right-[-100px] w-[300px] h-[300px] rounded-full bg-white/10" />
        <div className="absolute bottom-[-50px] left-[-50px] w-[200px] h-[200px] rounded-full bg-white/10" />
        <div className="absolute top-[20%] left-[10%] w-[80px] h-[80px] rounded-full bg-white/10" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center relative z-10 max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl mb-1 backdrop-blur-sm">
            <Image
              src="/images/logo2.png"
              alt="Logo"
              width={55}
              height={55}
            />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-1 leading-tight">
            ระบบลงทะเบียนชมรม
          </h1>
          <p className="text-white/80 text-lg md:text-xl mb-1">
            แผนกเทคโนโลยีสารสนเทศ
          </p>
          <p className="text-white/60 text-base mb-1">
            วิทยาลัยเทคนิคเชียงใหม่
          </p>

          {/* Countdown */}
          {canRegister && countdown && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-1"
            >
              <p className="text-white/70 text-sm mb-3">ปิดรับลงทะเบียนใน</p>
              <div className="flex justify-center gap-3">
                {[
                  { value: countdown.days, label: "วัน" },
                  { value: countdown.hours, label: "ชั่วโมง" },
                  { value: countdown.minutes, label: "นาที" },
                  { value: countdown.seconds, label: "วินาที" },
                ].map((item) => (
                  <div key={item.label} className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 min-w-[70px]">
                    <div className="text-2xl font-bold text-white">{String(item.value).padStart(2, "0")}</div>
                    <div className="text-xs text-white/60">{item.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {!canRegister && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white/15 backdrop-blur-sm rounded-xl px-6 py-4 mb-2 inline-block"
            >
              <p className="text-white font-medium flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                ปิดรับลงทะเบียนแล้ว
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Registration Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="w-full max-w-md mx-auto relative z-10 mt-5 mb-4 md:mb-20"
        >
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-1 text-center">
              เข้าสู่ระบบลงทะเบียน
            </h2>
            <p className="text-sm text-gray-500 mb-6 text-center">
              กรุณากรอกรหัสนักศึกษา 11 หลัก
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รหัสนักศึกษา
                </label>
                <input
                  id="student-id-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  value={studentId}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setStudentId(val);
                    setError("");
                    setAlreadyRegistered(null);
                  }}
                  placeholder="กรอกรหัสนักศึกษา 11 หลัก"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg text-center tracking-widest font-medium transition-colors outline-none"
                  style={{ "--tw-ring-color": "#DC2626" }}
                  onFocus={(e) => (e.target.style.borderColor = "#DC2626")}
                  onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
                  disabled={!canRegister}
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl mb-4"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}

              {alreadyRegistered && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 mb-4"
                >
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">ลงทะเบียนแล้ว</span>
                  </div>
                  <p className="text-sm text-green-600">
                    {alreadyRegistered.student.prefix}{alreadyRegistered.student.first_name} {alreadyRegistered.student.last_name}
                  </p>
                  <p className="text-sm text-green-600">
                    ชมรม: <strong>{alreadyRegistered.registration.club_name}</strong>
                  </p>
                </motion.div>
              )}

              <button
                id="submit-btn"
                type="submit"
                disabled={!canRegister || loading || studentId.length !== 11}
                className="w-full text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #DC2626 0%, #991B1B 100%)" }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>ตรวจสอบรหัส</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <a
                href="/admin/login"
                className="text-sm text-gray-400 hover:text-red-600 transition-colors"
              >
                เข้าสู่ระบบแอดมิน →
              </a>
            </div>
          </div>
        </motion.div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 30C1440 30 1200 0 720 0C240 0 0 30 0 30L0 60Z" fill="white" />
          </svg>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white py-4 text-center text-sm text-gray-400">
        <p>© 2026 แผนกเทคโนโลยีสารสนเทศ วิทยาลัยเทคนิคเชียงใหม่</p>
      </footer>
    </div>
  );
}