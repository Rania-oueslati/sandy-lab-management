const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'sandy',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'sandy_lab',
  password: process.env.DB_PASSWORD || 'sandy123',
  port: process.env.DB_PORT || 5433,
});

pool.on('connect', () => {
  console.log('[Database] Connected to the PostgreSQL database.');
});

pool.on('error', (err) => {
  console.error('[Database] Connection error:', err.stack);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
