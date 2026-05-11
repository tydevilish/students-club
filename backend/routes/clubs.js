const express = require('express');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clubs ORDER BY created_at ASC');
    res.json(rows);
  } catch (err) {
    console.error('Get clubs error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clubs WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'ไม่พบชมรม' });
    res.json(rows[0]);
  } catch (_err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, max_members } = req.body;
    if (!name) return res.status(400).json({ error: 'กรุณากรอกชื่อชมรม' });

    if (max_members !== undefined && parseInt(max_members) <= 0) {
      return res.status(400).json({ error: 'จำนวนรับสูงสุดต้องมากกว่า 0' });
    }

    const [result] = await pool.query(
      'INSERT INTO clubs (name, description, max_members) VALUES (?, ?, ?)',
      [name, description || '', max_members || 30]
    );
    const [newClub] = await pool.query('SELECT * FROM clubs WHERE id = ?', [result.insertId]);
    const io = req.app.get('io');
    if (io) io.emit('club:updated', newClub[0]);
    res.status(201).json(newClub[0]);
  } catch (_err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, max_members, is_active } = req.body;
    const [existing] = await pool.query('SELECT id, current_members FROM clubs WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'ไม่พบชมรม' });

    if (max_members !== undefined) {
      const parsedMax = parseInt(max_members);
      if (parsedMax <= 0) {
        return res.status(400).json({ error: 'จำนวนรับสูงสุดต้องมากกว่า 0' });
      }
      if (parsedMax < existing[0].current_members) {
        return res.status(400).json({ error: `ไม่สามารถปรับลดให้น้อยกว่าสมาชิกปัจจุบัน (${existing[0].current_members} คน) ได้` });
      }
    }

    await pool.query(
      'UPDATE clubs SET name=COALESCE(?,name), description=COALESCE(?,description), max_members=COALESCE(?,max_members), is_active=COALESCE(?,is_active) WHERE id=?',
      [name, description, max_members, is_active, id]
    );
    const [updated] = await pool.query('SELECT * FROM clubs WHERE id = ?', [id]);
    const io = req.app.get('io');
    if (io) io.emit('club:updated', updated[0]);
    res.json(updated[0]);
  } catch (_err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT id FROM clubs WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ error: 'ไม่พบชมรม' });
    await pool.query('DELETE FROM clubs WHERE id = ?', [id]);
    const io = req.app.get('io');
    if (io) io.emit('club:deleted', { id: parseInt(id) });
    res.json({ message: 'ลบชมรมสำเร็จ' });
  } catch (_err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
