const requestCounts = new Map();

// เคลียร์ Memory ทุกๆ 15 นาที เพื่อป้องกัน Memory Leak
setInterval(() => {
  requestCounts.clear();
}, 15 * 60 * 1000);

const loginRateLimiter = (req, res, next) => {
  // ดึง IP ของผู้ใช้ (รองรับกรณีอยู่หลัง Reverse Proxy เช่น Nginx หรือ Docker)
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  
  const currentTime = Date.now();
  const windowMs = 15 * 60 * 1000; // กรอบเวลา 15 นาที
  const maxRequests = 5; // อนุญาตให้ล็อกอิน (ทั้งถูกและผิดรวมกัน) ไม่เกิน 5 ครั้งในเวลาที่กำหนด

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, startTime: currentTime });
    return next();
  }

  const record = requestCounts.get(ip);

  // ถ้าระยะเวลาผ่านไปเกิน 15 นาทีแล้ว ให้รีเซ็ตการนับใหม่
  if (currentTime - record.startTime > windowMs) {
    record.count = 1;
    record.startTime = currentTime;
    return next();
  }

  // ถ้ายังอยู่ในช่วง 15 นาที และจำนวนครั้งเกิน 5 ครั้ง ให้บล็อก
  if (record.count >= maxRequests) {
    return res.status(429).json({ 
      error: 'คุณพยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' 
    });
  }

  // เพิ่มจำนวนครั้งที่ล็อกอิน
  record.count += 1;
  next();
};

// ฟังก์ชันสำหรับรีเซ็ตจำนวนครั้ง เมื่อผู้ใช้ล็อกอินสำเร็จ
const resetLoginAttempts = (req) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  requestCounts.delete(ip);
};

module.exports = { loginRateLimiter, resetLoginAttempts };
