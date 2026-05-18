const express = require('express');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/students — List all (admin)
// GET /api/students/export — Export all as CSV (admin)
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const search = req.query.search || '';
    const status = req.query.status || 'all';
    const level  = req.query.level  || '';

    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(s.student_id LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?)');
      const p = `%${search}%`;
      params.push(p, p, p);
    }
    if (status === 'registered')   conditions.push('r.id IS NOT NULL');
    if (status === 'unregistered') conditions.push('r.id IS NULL');
    if (level) {
      conditions.push('s.level = ?');
      params.push(level);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT s.student_id, s.prefix, s.first_name, s.last_name, s.level,
              COALESCE(c.name, '') as club_name,
              DATE_FORMAT(r.registered_at, '%Y-%m-%d %H:%i:%s') as registered_at
       FROM students s
       LEFT JOIN registrations r ON s.id = r.student_id
       LEFT JOIN clubs c ON r.club_id = c.id
       ${where}
       ORDER BY s.level, s.student_id`,
      params
    );

    // Build CSV with UTF-8 BOM (required for Google Sheets / Excel Thai)
    const BOM = '\uFEFF';
    const headers = ['รหัสนักศึกษา', 'คำนำหน้า', 'ชื่อ', 'นามสกุล', 'ระดับชั้น', 'ชมรม', 'วันที่ลงทะเบียน'];
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csvRows = [
      headers.map(escape).join(','),
      ...rows.map(r => [
        r.student_id, r.prefix, r.first_name, r.last_name,
        r.level, r.club_name, r.registered_at,
      ].map(escape).join(',')),
    ];

    const filename = `students_${new Date().toISOString().slice(0,10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(BOM + csvRows.join('\r\n'));
  } catch (err) {
    console.error('Export students error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/students — List all (admin)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const search = req.query.search || '';
    const status = req.query.status || 'all'; // 'all' | 'registered' | 'unregistered'
    const level  = req.query.level  || '';    // '' | 'ปวช.1' | 'ปวช.2' | ... | 'ปวส.2'
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const conditions = [];
    let params = [];

    if (search) {
      conditions.push('(s.student_id LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?)');
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (status === 'registered') {
      conditions.push('r.id IS NOT NULL');
    } else if (status === 'unregistered') {
      conditions.push('r.id IS NULL');
    }

    if (level) {
      conditions.push('s.level = ?');
      params.push(level);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total
       FROM students s
       LEFT JOIN registrations r ON s.id = r.student_id
       ${whereClause}`,
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

    // Count totals for each status (unfiltered by status, but filtered by search)
    const searchConditions = search
      ? ['(s.student_id LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?)'] : [];
    const searchParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];
    const searchWhere = searchConditions.length > 0 ? `WHERE ${searchConditions.join(' AND ')}` : '';

    const [summaryRows] = await pool.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END) as registered,
        SUM(CASE WHEN r.id IS NULL THEN 1 ELSE 0 END) as unregistered
       FROM students s
       LEFT JOIN registrations r ON s.id = r.student_id
       ${searchWhere}`,
      searchParams
    );

    res.json({
      students: rows,
      total: countRows[0].total,
      page,
      totalPages: Math.ceil(countRows[0].total / limit),
      summary: {
        total: Number(summaryRows[0].total),
        registered: Number(summaryRows[0].registered),
        unregistered: Number(summaryRows[0].unregistered),
      },
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
