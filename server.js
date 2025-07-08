require('dotenv').config();  // Load .env variables

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const session = require('express-session');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const NODE_ENV = process.env.NODE_ENV || 'development';
const JWT_SECRET = process.env.JWT_SECRET || 'pick-a-long-random-string';

// Debug print of DB config (never print passwords in production logs)
console.log('DB Config:', {
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD ? '******' : undefined,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT || 3306
});

// CORS setup — allow production and local development
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:3000'],
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware for admin login
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'none',
    secure: true
  }
}));

// MySQL connection using environment variables
const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT || 3306
});

db.connect((err) => {
  if (err) {
    console.error('🚫 MySQL Connection Failed:', err);
  } else {
    console.log('✅ Connected to MySQL Database');
  }
});

const ADMIN_USER = 'kingtaper';
const ADMIN_PASS = 'taper@2024'; // Change this in production!

// Save booking endpoint
app.post('/api/book', (req, res) => {
  const { name, email, phone, service, price, date, time, message } = req.body;

  console.log('📥 Incoming booking data:', req.body);  // Log received data

  const query = `
    INSERT INTO bookings (name, email, phone, service, price, date, time, message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [name, email, phone, service, price, date, time, message],
    (err, results) => {
      if (err) {
        console.error('❌ DB Insert Error:', err);  // Log DB errors
        return res.json({ success: false, error: err.message });
      }

      console.log('✅ Booking saved successfully:', results);  // Log successful insert
      return res.json({ success: true });
    }
  );
});

// Temporary debug endpoint to view all bookings
app.get('/api/bookings/debug', (req, res) => {
  db.query('SELECT * FROM bookings ORDER BY id DESC', (err, results) => {
    if (err) {
      console.error('❌ Fetch bookings error:', err);
      return res.status(500).json({ error: 'DB fetch failed' });
    }
    console.log('📊 Current bookings:', results);
    res.json(results);
  });
});

// Admin login endpoint (JWT)
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    // sign a 2-hour token
    const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '2h' });
    return res.json({ success: true, token });
  }
  res.status(401).json({ success: false, error: 'Invalid credentials' });
});

// JWT auth middleware
function checkToken(req, res, next) {
  const auth = req.headers.authorization || '';
  const [scheme, token] = auth.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, error: 'No token' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload.admin) throw new Error();
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

// Protect bookings endpoint with JWT
app.get('/api/admin/bookings', checkToken, (req, res) => {
  const { start, end } = req.query;
  let sql = 'SELECT * FROM bookings';
  let params = [];
  if (start && end) {
    sql += ' WHERE date BETWEEN ? AND ?';
    params = [start, end];
  }
  sql += ' ORDER BY id DESC';
  db.query(sql, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    res.json({ success: true, bookings: results });
  });
});

// Delete a booking (protected)
app.delete('/api/admin/bookings/:id', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const { id } = req.params;
  db.query('DELETE FROM bookings WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    res.json({ success: true });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// NOTE: For production, set NODE_ENV=production and SESSION_SECRET in Railway environment variables.
