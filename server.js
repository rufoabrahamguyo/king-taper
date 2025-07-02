const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ Correct CORS with credentials support for your admin frontend
app.use(cors({
  origin: 'http://localhost:49937',
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Session middleware (needed for admin login)
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true
}));


// MySQL setup
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Taper@123',       // 👈 empty string since no password
  database: 'king_taper'
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
  console.log('Received booking request:', req.body);  // Add this line

  const { name, email, phone, service, price, date, time, message } = req.body;
  const sql = 'INSERT INTO bookings (name, email, phone, service, price, date, time, message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  db.query(sql, [name, email, phone, service, price, date, time, message], (err, result) => {
    if (err) {
      console.error('Database error:', err);  // Add detailed logging
      return res.status(500).json({ success: false, error: 'Database error' });
    }
    res.json({ success: true });
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