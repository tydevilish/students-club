"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Home, PartyPopper } from "lucide-react";

export default function SuccessPage() {
  const router = useRouter();
  const [student, setStudent] = useState(null);
  const [club, setClub] = useState(null);

  useEffect(() => {
    Promise.resolve().then(() => {
      const storedStudent = sessionStorage.getItem("student");
      const storedClub = sessionStorage.getItem("registered_club");

      if (!storedStudent || !storedClub) {
        router.push("/");
        return;
      }

      setStudent(JSON.parse(storedStudent));
      setClub(JSON.parse(storedClub));
    });

    // Automatically redirect to home page after 3 seconds
    const timer = setTimeout(() => {
      sessionStorage.removeItem("student");
      sessionStorage.removeItem("registered_club");
      router.push("/");
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  if (!student || !club) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-[-80px] right-[-80px] w-[250px] h-[250px] rounded-full bg-white/5" />
      <div className="absolute bottom-[-60px] left-[-60px] w-[200px] h-[200px] rounded-full bg-white/5" />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-white/20 rounded-full"
          style={{
            left: `${15 + i * 15}%`,
            top: `${10 + (i % 3) * 30}%`,
          }}
          animate={{
            y: [-20, 20, -20],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-md w-full text-center relative z-10"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <PartyPopper className="w-6 h-6 text-yellow-500" />
            <h1 className="text-2xl font-bold text-gray-800">ลงทะเบียนสำเร็จ!</h1>
            <PartyPopper className="w-6 h-6 text-yellow-500 scale-x-[-1]" />
          </div>
          <p className="text-gray-500 mb-8">ข้อมูลการลงทะเบียนของคุณ</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-50 rounded-2xl p-6 mb-6 text-left space-y-3"
        >
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">ชื่อ-นามสกุล</span>
            <span className="font-medium text-gray-800">
              {student.prefix}{student.first_name} {student.last_name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">รหัสนักศึกษา</span>
            <span className="font-medium text-gray-800">{student.student_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">ระดับชั้น</span>
            <span className="font-medium text-gray-800">{student.level}</span>
          </div>
          <hr className="border-gray-200" />
          <div className="flex justify-between">
            <span className="text-gray-500 text-sm">ชมรม</span>
            <span className="font-semibold text-primary-600">{club.name}</span>
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={() => {
            sessionStorage.removeItem("student");
            sessionStorage.removeItem("registered_club");
            router.push("/");
          }}
          className="w-full bg-gradient-to-br from-red-600 to-red-800 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98]"
        >
          <Home className="w-5 h-5" />
          กลับหน้าหลัก
        </motion.button>
      </motion.div>
    </div>
  );
}
