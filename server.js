require('dotenv').config();
const express    = require('express');
const mysql      = require('mysql2');
const cors       = require('cors');
const bodyParser = require('body-parser');
const session    = require('express-session');

const app      = express();
app.set('trust proxy', 1);

const PORT     = process.env.PORT || 3001;
// --- CORS and Session Settings for Production ---
// Set FRONTEND to your Netlify/custom domain, e.g. 'https://your-site.netlify.app' or 'https://www.kingtaper.com'
const FRONTEND = process.env.FRONTEND_URL || 'https://your-site.netlify.app';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors({
  origin: FRONTEND,
  credentials: true
}));
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === 'production',
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true
  }
}));

// Database pool
const db = mysql.createPool({
  host:     process.env.MYSQLHOST,
  user:     process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port:     process.env.MYSQLPORT
});

// 1) Save a booking
app.post('/api/book', (req, res) => {
  const { name, email, phone, service, price, date, time, message } = req.body;
  if (!name || !phone || !service || !price || !date || !time) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  const sql = `INSERT INTO bookings (name, email, phone, service, price, date, time, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql, [name, email, phone, service, price, date, time, message], (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.status(201).json({ success: true, bookingId: result.insertId });
  });
});

// 2) Admin login
app.post('/api/admin/login', (req, res) => {
  const { user, pass } = req.body;
  if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
    req.session.admin = true;
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, error: 'Invalid credentials' });
});

// 3) Admin logout
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ success: false, error: 'Logout failed' });
    res.clearCookie('connect.sid', { path: '/' });
    res.json({ success: true });
  });
});

// 4) Fetch all bookings (protected)
app.get('/api/admin/bookings', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const { start, end } = req.query;
  let sql = 'SELECT * FROM bookings';
  const params = [];
  if (start && end) {
    sql += ' WHERE date >= ? AND date <= ?';
    params.push(start, end);
  }
  sql += ' ORDER BY id DESC';
  db.query(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, bookings: rows });
  });
});

// 5) Update a booking (protected)
app.put('/api/admin/bookings/:id', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const { id } = req.params;
  const { name, email, phone, service, price, date, time, message } = req.body;
  const sql = `UPDATE bookings SET name=?, email=?, phone=?, service=?, price=?, date=?, time=?, message=? WHERE id=?`;
  db.query(sql, [name, email, phone, service, price, date, time, message, id], (err) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true });
  });
});

// 6) Delete a booking (protected)
app.delete('/api/admin/bookings/:id', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  db.query('DELETE FROM bookings WHERE id=?', [req.params.id], (err) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true });
  });
});

// Get booked times for a specific date
app.get('/api/booked-times', (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ success: false, error: 'Missing date parameter' });
  }
  db.query('SELECT time FROM bookings WHERE date = ?', [date], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    const times = rows.map(r => r.time);
    res.json({ success: true, times });
  });
});

// Start server
app.listen(PORT, () => console.log(`Bookings API listening on port ${PORT}`));
