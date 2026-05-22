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

// GET /api/settings/export-sql — Download SQL backup (admin)
router.get('/export-sql', authMiddleware, async (req, res) => {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    if (tables.length === 0) {
      return res.status(404).json({ error: 'ไม่พบตารางในฐานข้อมูล' });
    }

    const dbNameRow = tables[0];
    const key = Object.keys(dbNameRow)[0];
    const tableNames = tables.map(row => row[key]);

    let sqlDump = `-- ===================================================\n`;
    sqlDump += `-- Students Club Registration - Database SQL Export\n`;
    sqlDump += `-- Exported on: ${new Date().toLocaleString('th-TH')}\n`;
    sqlDump += `-- ===================================================\n\n`;
    sqlDump += `SET NAMES utf8mb4;\n`;
    sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    const escapeSqlValue = (val) => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return val;
      if (typeof val === 'boolean') return val ? 1 : 0;
      if (val instanceof Date) {
        return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
      }
      const escaped = String(val)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n');
      return `'${escaped}'`;
    };

    for (const tableName of tableNames) {
      // Get table structure
      const [createTableResult] = await pool.query(`SHOW CREATE TABLE \`${tableName}\``);
      const createTableSql = createTableResult[0]['Create Table'];
      
      sqlDump += `-- Table structure for table \`${tableName}\`\n`;
      sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      sqlDump += `${createTableSql};\n\n`;

      // Get table data
      const [rows] = await pool.query(`SELECT * FROM \`${tableName}\``);
      if (rows.length > 0) {
        sqlDump += `-- Dumping data for table \`${tableName}\`\n`;
        const cols = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');
        const valuesList = rows.map(row => {
          const vals = Object.values(row).map(escapeSqlValue).join(', ');
          return `(${vals})`;
        });
        
        // Chunk inserts to avoid extremely long lines
        const chunkSize = 100;
        for (let i = 0; i < valuesList.length; i += chunkSize) {
          const chunk = valuesList.slice(i, i + chunkSize);
          sqlDump += `INSERT INTO \`${tableName}\` (${cols}) VALUES\n${chunk.join(',\n')};\n`;
        }
        sqlDump += `\n`;
      }
    }

    sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    const filename = `backup_db_${new Date().toISOString().slice(0, 10)}.sql`;
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(sqlDump);
  } catch (err) {
    console.error('Export SQL error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล SQL' });
  }
});

// GET /api/settings/admins — List all admins (admin-only)
router.get('/admins', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, created_at FROM admins ORDER BY username');
    res.json(rows);
  } catch (err) {
    console.error('Get admins error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ดูแลระบบ' });
  }
});

// POST /api/settings/admins — Add new admin / grant access (admin-only)
router.post('/admins', authMiddleware, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'กรุณากรอก username และ password' });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      return res.status(400).json({ error: 'Username ต้องมีอย่างน้อย 3 ตัวอักษร' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password ต้องมีอย่างน้อย 6 ตัวอักษร' });
    }

    // Check if user already exists
    const [existing] = await pool.query('SELECT id FROM admins WHERE username = ?', [trimmedUsername]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username นี้ถูกใช้งานแล้ว' });
    }

    // Hash password with Bun.password.hash using bcrypt
    const hashedPassword = await Bun.password.hash(password, {
      algorithm: "bcrypt",
      cost: 10
    });

    await pool.query('INSERT INTO admins (username, password) VALUES (?, ?)', [trimmedUsername, hashedPassword]);
    res.status(201).json({ message: 'ให้สิทธิ์ผู้ดูแลระบบสำเร็จ' });
  } catch (err) {
    console.error('Create admin error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเพิ่มผู้ดูแลระบบ' });
  }
});

// DELETE /api/settings/admins/:id — Remove admin / revoke access (admin-only)
router.delete('/admins/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if trying to delete self
    if (String(req.admin.id) === String(id)) {
      return res.status(400).json({ error: 'คุณไม่สามารถลบสิทธิ์ของตัวเองได้' });
    }

    const [existing] = await pool.query('SELECT id FROM admins WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'ไม่พบผู้ดูแลระบบ' });
    }

    await pool.query('DELETE FROM admins WHERE id = ?', [id]);
    res.json({ message: 'ถอนสิทธิ์ผู้ดูแลระบบสำเร็จ' });
  } catch (err) {
    console.error('Delete admin error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการถอนสิทธิ์ผู้ดูแลระบบ' });
  }
});

module.exports = router;
