require('dotenv').config();  // Load .env variables

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3001;

// Debug print of DB config (never print passwords in production logs)
console.log('DB Config:', {
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD ? '******' : undefined,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT || 3306
});

// CORS setup — update origin to your Netlify frontend URL
app.use(cors({
  origin: 'https://jade-travesseiro-478a89.netlify.app',
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware for admin login
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true
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

// Get bookings (protected)
app.get('/api/admin/bookings', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  db.query('SELECT * FROM bookings ORDER BY created_at DESC', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    res.json({ success: true, bookings: results });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
