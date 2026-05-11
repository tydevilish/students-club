const express = require('express');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings — public
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM settings');
    const result = {};
    rows.forEach(r => { result[r.setting_key] = r.setting_value; });
    res.json(result);
  } catch (_err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/settings — admin
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { registration_open, registration_deadline } = req.body;

    if (registration_open !== undefined) {
      await pool.query(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        ['registration_open', String(registration_open), String(registration_open)]
      );
    }

    if (registration_deadline !== undefined) {
      await pool.query(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        ['registration_deadline', registration_deadline, registration_deadline]
      );
    }

    const [rows] = await pool.query('SELECT * FROM settings');
    const result = {};
    rows.forEach(r => { result[r.setting_key] = r.setting_value; });

    const io = req.app.get('io');
    if (io) io.emit('settings:changed', result);

    res.json(result);
  } catch (_err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/settings/stats — admin dashboard stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const [students] = await pool.query('SELECT COUNT(*) as count FROM students');
    const [clubs] = await pool.query('SELECT COUNT(*) as count FROM clubs');
    const [registrations] = await pool.query('SELECT COUNT(*) as count FROM registrations');
    const [clubStats] = await pool.query(
      'SELECT c.id, c.name, c.max_members, c.current_members FROM clubs c ORDER BY c.name'
    );

    res.json({
      totalStudents: students[0].count,
      totalClubs: clubs[0].count,
      totalRegistrations: registrations[0].count,
      registrationRate: students[0].count > 0
        ? Math.round((registrations[0].count / students[0].count) * 100)
        : 0,
      clubStats,
    });
  } catch (_err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
