const express = require('express');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/registrations — ลงทะเบียนชมรม (public)
router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { student_id, student_id_code, club_id } = req.body;
    if (!student_id || !student_id_code || !club_id) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบ' });
    }

    // Check settings
    const [settings] = await conn.query('SELECT * FROM settings');
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });
    const isOpen = settingsMap['registration_open'] === 'true';
    const deadline = settingsMap['registration_deadline'];
    const now = new Date();
    if (!isOpen || (deadline && now > new Date(deadline))) {
      return res.status(400).json({ error: 'ปิดรับลงทะเบียนแล้ว' });
    }

    await conn.beginTransaction();

    // Check student exists and matches student_id_code (Security: prevent IDOR)
    const [studentRows] = await conn.query('SELECT id, student_id FROM students WHERE id = ?', [student_id]);
    if (studentRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'ไม่พบนักศึกษา' });
    }
    
    if (studentRows[0].student_id !== student_id_code) {
      await conn.rollback();
      return res.status(403).json({ error: 'ข้อมูลนักศึกษาไม่ถูกต้อง' });
    }

    // Check already registered
    const [existingReg] = await conn.query('SELECT id FROM registrations WHERE student_id = ?', [student_id]);
    if (existingReg.length > 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'นักศึกษาลงทะเบียนแล้ว' });
    }

    // Check club capacity with lock
    const [clubRows] = await conn.query('SELECT * FROM clubs WHERE id = ? FOR UPDATE', [club_id]);
    if (clubRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'ไม่พบชมรม' });
    }
    const club = clubRows[0];
    if (club.current_members >= club.max_members) {
      await conn.rollback();
      return res.status(400).json({ error: 'ชมรมนี้เต็มแล้ว' });
    }

    // Insert registration
    await conn.query('INSERT INTO registrations (student_id, club_id) VALUES (?, ?)', [student_id, club_id]);
    await conn.query('UPDATE clubs SET current_members = current_members + 1 WHERE id = ?', [club_id]);

    await conn.commit();

    // Get updated club data
    const [updatedClub] = await pool.query('SELECT * FROM clubs WHERE id = ?', [club_id]);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('club:updated', updatedClub[0]);
      io.emit('registration:new', { student_id, club_id });
    }

    res.status(201).json({ message: 'ลงทะเบียนสำเร็จ', club: updatedClub[0] });
  } catch (err) {
    await conn.rollback();
    console.error('Registration error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  } finally {
    conn.release();
  }
});

// GET /api/registrations — List all (admin)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const clubFilter = req.query.club_id;
    let query = `
      SELECT r.id, r.registered_at,
        s.student_id, s.prefix, s.first_name, s.last_name, s.level,
        c.id as club_id, c.name as club_name
      FROM registrations r
      JOIN students s ON r.student_id = s.id
      JOIN clubs c ON r.club_id = c.id
    `;
    const params = [];
    if (clubFilter) {
      query += ' WHERE r.club_id = ?';
      params.push(clubFilter);
    }
    query += ' ORDER BY r.registered_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Get registrations error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/registrations/:id — ยกเลิกลงทะเบียน (admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    await conn.beginTransaction();

    const [regRows] = await conn.query('SELECT * FROM registrations WHERE id = ?', [id]);
    if (regRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'ไม่พบรายการลงทะเบียน' });
    }

    const reg = regRows[0];
    await conn.query('DELETE FROM registrations WHERE id = ?', [id]);
    await conn.query('UPDATE clubs SET current_members = GREATEST(current_members - 1, 0) WHERE id = ?', [reg.club_id]);

    await conn.commit();

    const [updatedClub] = await pool.query('SELECT * FROM clubs WHERE id = ?', [reg.club_id]);
    const io = req.app.get('io');
    if (io) {
      io.emit('club:updated', updatedClub[0]);
      io.emit('registration:removed', { id: parseInt(id) });
    }

    res.json({ message: 'ยกเลิกลงทะเบียนสำเร็จ' });
  } catch (err) {
    await conn.rollback();
    console.error('Delete registration error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  } finally {
    conn.release();
  }
});

module.exports = router;
