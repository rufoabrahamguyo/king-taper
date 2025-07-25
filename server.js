// server.js

// 1) Load environment variables from the right file
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env';
require('dotenv').config({ path: envFile });

const express    = require('express');
const mysql      = require('mysql2');
const cors       = require('cors');
const bodyParser = require('body-parser');
const session    = require('express-session');

const app = express();

// 2) Trust proxy (Railway/Netlify) so secure cookies are set correctly
app.set('trust proxy', 1);

const PORT     = process.env.PORT || 3001;
const FRONTEND = process.env.FRONTEND_URL;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 3) Middleware
app.use(cors({
  origin:      FRONTEND,
  credentials: true
}));
app.use(bodyParser.json());
app.use(session({
  name: 'connect.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure:   NODE_ENV === 'production',    // false in dev, true in prod
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true
  }
}));

// 4) Database pool
const db = mysql.createPool({
  host:     process.env.MYSQLHOST,
  user:     process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port:     process.env.MYSQLPORT
});

// 5) Ensure unique (date,time) constraint
db.query(
  `ALTER TABLE bookings
     ADD CONSTRAINT uq_bookings_date_time UNIQUE (date, time)`,
  (err) => {
    if (err && err.code !== 'ER_DUP_KEYNAME') {
      console.error('❌ Could not add unique constraint:', err);
    } else {
      console.log('✅ Unique constraint on (date,time) ensured.');
    }
  }
);

// 6) Business hours slots
const ALL_TIME_SLOTS = [
  "09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30",
  "15:00","15:30","16:00","16:30","17:00"
];

// --- ROUTES ---

// 6.1) Create a booking
app.post('/api/book', (req, res) => {
  const { name, email, phone, service, price, date, time, message } = req.body;
  if (!name || !phone || !service || !price || !date || !time) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  // Check slot
  db.query(
    'SELECT COUNT(*) AS count FROM bookings WHERE date=? AND time=?',
    [date, time],
    (err, results) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      if (results[0].count > 0) {
        return res.status(409).json({ success: false, error: 'Time slot already booked' });
      }
      // Insert booking
      const sql = `INSERT INTO bookings
        (name,email,phone,service,price,date,time,message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      db.query(
        sql,
        [name, email, phone, service, price, date, time, message],
        (err, result) => {
          if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
              return res.status(409).json({ success: false, error: 'Time slot already booked' });
            }
            return res.status(500).json({ success: false, error: err.message });
          }
          res.status(201).json({ success: true, bookingId: result.insertId });
        }
      );
    }
  );
});

// 6.2) Admin login
app.post('/api/admin/login', (req, res) => {
  const { user, pass } = req.body;
  if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
    req.session.admin = true;
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, error: 'Invalid credentials' });
});

// 6.3) Admin logout
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ success: false, error: 'Logout failed' });
    res.clearCookie('connect.sid', { path: '/' });
    res.json({ success: true });
  });
});

// 6.4) Fetch bookings
app.get('/api/admin/bookings', (req, res) => {
  if (!req.session.admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const { start, end } = req.query;
  let sql = 'SELECT * FROM bookings';
  const params = [];
  if (start && end) {
    sql += ' WHERE date BETWEEN ? AND ?';
    params.push(start, end);
  }
  sql += ' ORDER BY id DESC';
  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, bookings: rows });
  });
});

// 6.5) Update booking
app.put('/api/admin/bookings/:id', (req, res) => {
  if (!req.session.admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
  const { id } = req.params;
  const { name, email, phone, service, price, date, time, message } = req.body;
  const sql = `UPDATE bookings
                 SET name=?, email=?, phone=?, service=?, price=?, date=?, time=?, message=?
               WHERE id=?`;
  db.query(sql, [name, email, phone, service, price, date, time, message, id], err => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true });
  });
});

// 6.6) Delete booking
app.delete('/api/admin/bookings/:id', (req, res) => {
  if (!req.session.admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
  db.query('DELETE FROM bookings WHERE id=?', [req.params.id], err => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true });
  });
});

// 6.7) Available times
app.get('/api/available-times', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ success: false, error: 'Missing date parameter' });
  db.query('SELECT time FROM bookings WHERE date=?', [date], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    const booked = rows.map(r => r.time);
    const available = ALL_TIME_SLOTS.filter(t => !booked.includes(t));
    res.json({ success: true, times: available });
  });
});

// 6.8) Booked times
app.get('/api/booked-times', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ success: false, error: 'Missing date parameter' });
  db.query('SELECT time FROM bookings WHERE date=?', [date], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, times: rows.map(r => r.time) });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
});