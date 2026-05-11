const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_NAME || 'club_registration',
  waitForConnections: true,
  connectionLimit: 100,
  queueLimit: 0,
  charset: 'utf8mb4',
});

module.exports = pool;
