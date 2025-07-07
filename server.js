require('dotenv').config();  // Load .env variables

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const NODE_ENV = process.env.NODE_ENV || 'development';

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
  origin: [FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'], // Allow your frontend URLs + localhost for dev
  credentials: true // Required to allow cookies to be sent cross-origin
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware for admin login
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax', // Use 'none' in production for cross-site cookie
    secure: NODE_ENV === 'production' // true means cookies only sent over HTTPS in prod
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
    console.error('MySQL connection error:', err);
  } else {
    console.log('Connected to MySQL');
  }
});

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123'; // Change this in production!

// Save booking endpoint
app.post('/api/book', (req, res) => {
  const { name, email, phone, service, price, date, time, message } = req.body;
  console.log('Booking attempt:', req.body);
  console.log('Request headers:', req.headers);

  // Check if the slot is already booked
  const checkSql = 'SELECT COUNT(*) AS count FROM bookings WHERE date = ? AND time = ?';
  db.query(checkSql, [date, time], (err, results) => {
    if (err) {
      console.error('Database error (checking slot):', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    if (results[0].count > 0) {
      console.log('Time slot already booked:', date, time);
      return res.status(409).json({ success: false, error: 'Time slot already booked' });
    }
    // If not booked, insert booking
    const sql = 'INSERT INTO bookings (name, email, phone, service, price, date, time, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [name, email, phone, service, price, date, time, message], (err2, result) => {
      if (err2) {
        console.error('Database error (inserting booking):', err2);
        return res.status(500).json({ success: false, error: 'Database error' });
      }
      console.log('Booking saved successfully:', result.insertId);
      res.json({ success: true });
    });
  });
});

// Admin login endpoint
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.admin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Get bookings with optional date filter (protected)
app.get('/api/admin/bookings', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  const { start, end } = req.query;
  let sql = 'SELECT * FROM bookings';
  let params = [];
  if (start && end) {
    sql += ' WHERE date BETWEEN ? AND ?';
    params = [start, end];
  }
  sql += ' ORDER BY created_at DESC';
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
