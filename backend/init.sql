-- ===================================================
-- ระบบลงทะเบียนชมรม — Database Schema & Seed Data
-- ===================================================

CREATE DATABASE IF NOT EXISTS club_registration
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE club_registration;

-- ตาราง admins
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง students (นักเรียน/นักศึกษา)
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(11) UNIQUE NOT NULL,
  prefix VARCHAR(20) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  level VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_student_id (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง clubs (ชมรม)
CREATE TABLE IF NOT EXISTS clubs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  max_members INT NOT NULL DEFAULT 30,
  current_members INT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง registrations (การลงทะเบียน)
CREATE TABLE IF NOT EXISTS registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  club_id INT NOT NULL,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  UNIQUE KEY unique_student (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ตาราง settings (ตั้งค่าระบบ)
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================
-- Seed Data
-- ===================================================

-- Admin user (password hashed: admin123)
INSERT INTO admins (username, password) VALUES
('admin', '$2a$10$dMXCJp3LCFaLR/nH0Rm2K.eYiAVrCd.eI9.fhXYLSVh2bW8xSzBJm');

-- 5 ชมรมตัวอย่าง
INSERT INTO clubs (name, description, max_members) VALUES
('ชมรมพัฒนาเว็บไซต์', 'เรียนรู้การพัฒนาเว็บไซต์ด้วยเทคโนโลยีสมัยใหม่ HTML, CSS, JavaScript, React, Node.js', 30),
('ชมรมหุ่นยนต์และ IoT', 'สร้างหุ่นยนต์และระบบ IoT ด้วย Arduino, Raspberry Pi พร้อมแข่งขันระดับประเทศ', 25),
('ชมรมเกมและแอนิเมชัน', 'ออกแบบและพัฒนาเกม สร้างแอนิเมชัน 2D/3D ด้วย Unity และ Blender', 20),
('ชมรมเครือข่ายและความปลอดภัย', 'เรียนรู้ระบบเครือข่ายคอมพิวเตอร์ Cybersecurity และการดูแลเซิร์ฟเวอร์', 25),
('ชมรมกราฟิกดีไซน์', 'ออกแบบกราฟิก สื่อสิ่งพิมพ์ และสื่อดิจิทัล ด้วย Photoshop, Illustrator, Figma', 30);

-- นักเรียนตัวอย่าง 15 คน (รหัส 11 หลัก)
INSERT INTO `students` (`student_id`, `prefix`, `first_name`, `last_name`, `level`) VALUES
('68319010001', 'นาย', 'กิตติคุณ', 'ชูบุญ', 'ปวส.2'),
('68319010002', 'นาย', 'ไกรวิชญ์', 'อันเกษ', 'ปวส.2'),
('68319010003', 'นาย', 'เขมทัต', 'ศรีดวง', 'ปวส.2'),
('68319010004', 'นาย', 'คณาธิป', 'ฐานดี', 'ปวส.2'),
('68319010005', 'นาย', 'จิรภัทร', 'ป่าไพร', 'ปวส.2'),
('68319010006', 'นาย', 'จิรภาส', 'ฤทธิแผลง', 'ปวส.2'),
('68319010007', 'นาย', 'ชลสิทธิ์', 'แสงปินตา', 'ปวส.2'),
('68319010008', 'นาย', 'ชวนากร', 'ไชยวงค์', 'ปวส.2'),
('68319010009', 'นาย', 'ชันดนัย', 'พรมแดง', 'ปวส.2'),
('68319010011', 'นาย', 'ณัฏฐณวัฒน์', 'มานะกิจ', 'ปวส.2'),
('68319010012', 'นาย', 'ตุลธร', 'เลาว่าง', 'ปวส.2'),
('68319010013', 'นาย', 'ทวีศักดิ์', 'นำมา', 'ปวส.2'),
('68319010014', 'นาย', 'ธนกร', 'มีทรัพย์', 'ปวส.2'),
('68319010015', 'นาย', 'ธนกฤต', 'กุณะแสงคำ', 'ปวส.2'),
('68319010016', 'นาย', 'ธนากร', 'สุนโท', 'ปวส.2'),
('68319010017', 'นาย', 'ธีรภัทร', 'คำชุม', 'ปวส.2'),
('68319010018', 'นาย', 'นพศิลป์', 'คุ้มโต', 'ปวส.2'),
('68319010019', 'นาย', 'นราวิชญ์', 'พิชัย', 'ปวส.2'),
('68319010020', 'นาย', 'บวรทัต', 'ไชยวงค์', 'ปวส.2'),
('68319010021', 'นาย', 'ปี', 'สุขใจ', 'ปวส.2'),
('68319010022', 'นาย', 'พสิษฐ์', 'จงงามวิไล', 'ปวส.2'),
('68319010023', 'นาย', 'พัทธดนย์', 'กาชัย', 'ปวส.2'),
('68319010024', 'นางสาว', 'ภัคจิรา', 'พากเพียร', 'ปวส.2'),
('68319010025', 'นาย', 'วรากร', 'ไชยยา', 'ปวส.2'),
('68319010026', 'นาย', 'สราวุฒิ', 'ชัยวงค์', 'ปวส.2'),
('68319010027', 'นาย', 'สุขสันต์', 'มัสละ', 'ปวส.2'),
('68319010028', 'นาย', 'เสฎฐวุฒิ', 'ขาวสะอาด', 'ปวส.2'),
('68319010029', 'นาย', 'อดิชาติ', 'ใจสวน', 'ปวส.2'),
('68319010030', 'นาย', 'อนุวัฒน์', 'สมเดช', 'ปวส.2'),
('68319010031', 'นาย', 'นนทพัทธ์', 'เนตรผาบ', 'ปวส.2'),
('68319010032', 'นาย', 'ธนกฤต', 'สุปัญญา', 'ปวส.2'),
('68319010033', 'นาย', 'กรวิชญ์', 'กองเงิน', 'ปวส.2'),
('68319010034', 'นาย', 'ธีรเมธ', 'คำจา', 'ปวส.2'),
('68319010035', 'นางสาว', 'ธนพรพรรณ', 'อภิชนภูกรี', 'ปวส.2'),
('68319010036', 'นาย', 'ผไทภักดี', 'อาจวัจิตร', 'ปวส.2'),
('68319010037', 'นาย', 'ภัทรศัย', 'ใจพงค์', 'ปวส.2'),
('68319010038', 'นาย', 'ศุภฤกษ์', 'อุดมกสพ', 'ปวส.2'),
('68319010062', 'นาย', 'จัตตพัฒน์', 'จันทะกี', 'ปวส.2'),
('68319010063', 'นาย', 'ชลธี', 'เลี้ยงบุตร', 'ปวส.2'),
('68319010065', 'นาย', 'โชติกร', 'สุวรรณสาร', 'ปวส.2'),

-- ข้อมูลจากรูปภาพที่ 2 (image_ad4e59.png)
('68319010039', 'นาย', 'กฤษณะ', 'พรมโยธา', 'ปวส.2'),
('68319010040', 'นาย', 'จตุพล', 'ห้วนนา', 'ปวส.2'),
('68319010041', 'นาย', 'เฉลิมพล', 'กิติประภา', 'ปวส.2'),
('68319010042', 'นาย', 'ณัฏฐ์ณนน', 'โพธิ์อัมพล', 'ปวส.2'),
('68319010043', 'นาย', 'ทยากร', 'อินตานอน', 'ปวส.2'),
('68319010044', 'นาย', 'นภดล', 'ชัยยา', 'ปวส.2'),
('68319010045', 'นาย', 'ปัฐพล', 'วงค์เลย', 'ปวส.2'),
('68319010046', 'นาย', 'พงศ์เทพ', 'ลุงหย่า', 'ปวส.2'),
('68319010047', 'นาย', 'พสิษฐ์', 'ประวรรณ', 'ปวส.2'),
('68319010048', 'นาย', 'พสิษฐ์พงษ์', 'บุญเรือง', 'ปวส.2'),
('68319010049', 'นาย', 'เพชรรพัพัฒน์', 'นันตรัตน์', 'ปวส.2'),
('68319010050', 'นาย', 'ภัทรดนัย', 'แก้วจัน', 'ปวส.2'),
('68319010051', 'นาย', 'วีรภัทร', 'สมนะ', 'ปวส.2'),
('68319010052', 'นาย', 'วีราพงศ์', 'ธรรมใจ', 'ปวส.2'),
('68319010053', 'นาย', 'ศุภกร', 'เปรมมะโน', 'ปวส.2'),
('68319010054', 'นาย', 'ศุภณัฐ', 'ใจชุ่มใจ', 'ปวส.2'),
('68319010055', 'นางสาว', 'สุดาแก้ว', 'พญา', 'ปวส.2'),
('68319010056', 'นาย', 'เสกสรรณ์', 'ชายกวินภพ', 'ปวส.2'),
('68319010057', 'นางสาว', 'อรชุมา', 'จอต๊ะ', 'ปวส.2'),
('68319010058', 'นาย', 'อัมรินทร์', 'ทองคำ', 'ปวส.2'),
('68319010059', 'นาย', 'ถามเม', 'แย้มสำรวจ', 'ปวส.2'),
('68319010060', 'นางสาว', 'อมรา', 'อิศระภักดี', 'ปวส.2'),
('68319010061', 'นาย', 'ศุภกิจ', 'พลอยแดง', 'ปวส.2'),
('68319010064', 'นาย', 'วีรภัทร', 'ปึมป้อ', 'ปวส.2');

-- Settings เริ่มต้น
INSERT INTO settings (setting_key, setting_value) VALUES
('registration_open', 'true'),
('registration_deadline', '2026-06-30 23:59:59');
