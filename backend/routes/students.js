const express = require('express');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/students — List all (admin)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = 'WHERE s.student_id LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?';
      const searchParam = `%${search}%`;
      params = [searchParam, searchParam, searchParam];
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM students s ${whereClause}`,
      params
    );

    const [rows] = await pool.query(
      `SELECT s.*, 
        r.club_id, c.name as club_name
       FROM students s
       LEFT JOIN registrations r ON s.id = r.student_id
       LEFT JOIN clubs c ON r.club_id = c.id
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      students: rows,
      total: countRows[0].total,
      page,
      totalPages: Math.ceil(countRows[0].total / limit),
    });
  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/students — Create (admin)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { student_id, prefix, first_name, last_name, level } = req.body;

    if (!student_id || !prefix || !first_name || !last_name || !level) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });
    }

    if (!/^\d{11}$/.test(student_id)) {
      return res.status(400).json({ error: 'รหัสนักศึกษาต้องเป็นตัวเลข 11 หลัก' });
    }

    const [existing] = await pool.query('SELECT id FROM students WHERE student_id = ?', [student_id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'รหัสนักศึกษานี้มีในระบบแล้ว' });
    }

    const [result] = await pool.query(
      'INSERT INTO students (student_id, prefix, first_name, last_name, level) VALUES (?, ?, ?, ?, ?)',
      [student_id, prefix, first_name, last_name, level]
    );

    const [newStudent] = await pool.query('SELECT * FROM students WHERE id = ?', [result.insertId]);
    res.status(201).json(newStudent[0]);
  } catch (err) {
    console.error('Create student error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/students/:id — Update (admin)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { student_id, prefix, first_name, last_name, level } = req.body;

    if (student_id && !/^\d{11}$/.test(student_id)) {
      return res.status(400).json({ error: 'รหัสนักศึกษาต้องเป็นตัวเลข 11 หลัก' });
    }

    const [existing] = await pool.query('SELECT id FROM students WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'ไม่พบนักศึกษา' });
    }

    if (student_id) {
      const [dup] = await pool.query('SELECT id FROM students WHERE student_id = ? AND id != ?', [student_id, id]);
      if (dup.length > 0) {
        return res.status(400).json({ error: 'รหัสนักศึกษานี้มีในระบบแล้ว' });
      }
    }

    await pool.query(
      'UPDATE students SET student_id = COALESCE(?, student_id), prefix = COALESCE(?, prefix), first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), level = COALESCE(?, level) WHERE id = ?',
      [student_id, prefix, first_name, last_name, level, id]
    );

    const [updated] = await pool.query('SELECT * FROM students WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Update student error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/students/:id — Delete (admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT id FROM students WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'ไม่พบนักศึกษา' });
    }

    // Check if student has registration, update club count
    const [reg] = await pool.query('SELECT club_id FROM registrations WHERE student_id = ?', [id]);
    if (reg.length > 0) {
      await pool.query('UPDATE clubs SET current_members = GREATEST(current_members - 1, 0) WHERE id = ?', [reg[0].club_id]);
    }

    await pool.query('DELETE FROM students WHERE id = ?', [id]);
    res.json({ message: 'ลบนักศึกษาสำเร็จ' });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/students/verify — ตรวจสอบรหัสนักศึกษา (public)
router.post('/verify', async (req, res) => {
  try {
    const { student_id } = req.body;

    if (!student_id || !/^\d{11}$/.test(student_id)) {
      return res.status(400).json({ error: 'กรุณากรอกรหัสนักศึกษา 11 หลัก' });
    }

    const [rows] = await pool.query('SELECT * FROM students WHERE student_id = ?', [student_id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบรหัสนักศึกษาในระบบ กรุณาตรวจสอบรหัสอีกครั้งหรือติดต่อผู้ดูแลระบบ' });
    }

    const student = rows[0];

    // Check if already registered
    const [regRows] = await pool.query(
      `SELECT r.*, c.name as club_name FROM registrations r
       JOIN clubs c ON r.club_id = c.id
       WHERE r.student_id = ?`,
      [student.id]
    );

    // Check registration settings
    const [settings] = await pool.query('SELECT * FROM settings');
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });

    const isOpen = settingsMap['registration_open'] === 'true';
    const deadline = settingsMap['registration_deadline'];
    const now = new Date();
    const deadlineDate = deadline ? new Date(deadline) : null;
    const isExpired = deadlineDate && now > deadlineDate;

    res.json({
      student: {
        id: student.id,
        student_id: student.student_id,
        prefix: student.prefix,
        first_name: student.first_name,
        last_name: student.last_name,
        level: student.level,
      },
      registration: regRows.length > 0 ? regRows[0] : null,
      registration_open: isOpen && !isExpired,
      deadline,
    });
  } catch (err) {
    console.error('Verify student error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
