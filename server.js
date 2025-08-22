// server.js

// 1) Load environment variables from the right file
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require('dotenv').config({ path: envFile });

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');

const config = require('./config');

const app = express();

// 2) Trust proxy (for Railway/Netlify cookies)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 3) Middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files from current directory
app.use(session({
  name: 'connect.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === 'production',
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true
  }
}));

// 4) Debug session logging
app.use((req, res, next) => {
  console.log('Session:', req.session);
  next();
});

// 5) MySQL connection pool
const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT
});



// Ensure unique constraint and add calendar_event_id column if it doesn't exist
db.query(
  `ALTER TABLE bookings ADD CONSTRAINT uq_bookings_date_time UNIQUE (date, time)`,
  (err) => {
    if (err && err.code !== 'ER_DUP_KEYNAME') {
      console.error('❌ Could not add unique constraint:', err);
    } else {
      console.log('✅ Unique constraint on (date,time) ensured.');
    }
  }
);

// Add calendar_event_id column if it doesn't exist
db.query(
  `SHOW COLUMNS FROM bookings LIKE 'calendar_event_id'`,
  (err, results) => {
    if (err) {
      console.error('❌ Could not check calendar_event_id column:', err);
    } else if (results.length === 0) {
      // Column doesn't exist, add it
      db.query(
        `ALTER TABLE bookings ADD COLUMN calendar_event_id VARCHAR(255)`,
        (addErr) => {
          if (addErr) {
            console.error('❌ Could not add calendar_event_id column:', addErr);
          } else {
            console.log('✅ Calendar event ID column added successfully.');
          }
        }
      );
    } else {
      console.log('✅ Calendar event ID column already exists.');
    }
  }
);

// Create blocked_time_slots table if it doesn't exist
db.query(
  `CREATE TABLE IF NOT EXISTS blocked_time_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    time TIME NOT NULL,
    reason VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_blocked_slot (date, time)
  )`,
  (err) => {
    if (err) {
      console.error('❌ Could not create blocked_time_slots table:', err);
    } else {
      console.log('✅ Blocked time slots table ensured.');
    }
  }
);

// Business hours - 40-minute intervals to match frontend
const ALL_TIME_SLOTS = [
  "09:00", "09:40", "10:20", "11:00", "11:40", "12:20",
  "13:00", "13:40", "14:20", "15:00", "15:40", "16:20",
  "17:00", "17:40", "18:20", "19:00", "19:40", "20:20", "21:00"
];

// --- ROUTES ---

// Booking creation
app.post('/api/book', async (req, res) => {
  const { name, email, phone, service, price, date, time, message } = req.body;
  if (!name || !phone || !service || !price || !date || !time) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    // Check if time slot is available
    const [checkResults] = await db.promise().query('SELECT COUNT(*) AS count FROM bookings WHERE date=? AND time=?', [date, time]);
    if (checkResults[0].count > 0) {
      return res.status(409).json({ success: false, error: 'Time slot already booked' });
    }

    // Create booking in database
    const [insertResult] = await db.promise().query(
      `INSERT INTO bookings (name,email,phone,service,price,date,time,message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, phone, service, price, date, time, message]
    );

    const bookingId = insertResult.insertId;
    const booking = { name, email, phone, service, price, date, time, message };



    res.status(201).json({ 
      success: true, 
      bookingId: bookingId
    });

  } catch (error) {
    console.error('❌ Error creating booking:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { user, pass } = req.body;
  if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
    req.session.admin = true;
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, error: 'Invalid credentials' });
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ success: false, error: 'Logout failed' });
    res.clearCookie('connect.sid', { path: '/' });
    res.json({ success: true });
  });
});

// Admin session check
app.get('/api/admin/check', (req, res) => {
  res.json({ loggedIn: !!req.session.admin });
});

// Get bookings
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

// Update booking
app.put('/api/admin/bookings/:id', async (req, res) => {
  if (!req.session.admin) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { id } = req.params;
  const { name, email, phone, service, price, date, time, message } = req.body;

  try {
    // Check if booking exists
    const [currentBooking] = await db.promise().query(
      'SELECT id FROM bookings WHERE id = ?',
      [id]
    );

    if (currentBooking.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }

    // Update booking in database
    await db.promise().query(
      `UPDATE bookings SET name=?, email=?, phone=?, service=?, price=?, date=?, time=?, message=? WHERE id=?`,
      [name, email, phone, service, price, date, time, message, id]
    );



    res.json({ success: true });

  } catch (error) {
    console.error('❌ Error updating booking:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete booking
app.delete('/api/admin/bookings/:id', async (req, res) => {
  if (!req.session.admin) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    // Check if booking exists
    const [booking] = await db.promise().query(
      'SELECT id FROM bookings WHERE id = ?',
      [req.params.id]
    );

    if (booking.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking not found' });
    }



    // Delete from database
    await db.promise().query('DELETE FROM bookings WHERE id=?', [req.params.id]);
    res.json({ success: true });

  } catch (error) {
    console.error('❌ Error deleting booking:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- BLOCKED TIME SLOTS MANAGEMENT ---

// Get blocked time slots
app.get('/api/admin/blocked-slots', async (req, res) => {
  if (!req.session.admin) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const { start, end } = req.query;
    let sql = 'SELECT * FROM blocked_time_slots';
    const params = [];

    if (start && end) {
      sql += ' WHERE date BETWEEN ? AND ?';
      params.push(start, end);
    }

    sql += ' ORDER BY date DESC, time ASC';
    const [rows] = await db.promise().query(sql, params);
    res.json({ success: true, blockedSlots: rows });

  } catch (error) {
    console.error('❌ Error fetching blocked slots:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add blocked time slot
app.post('/api/admin/blocked-slots', async (req, res) => {
  if (!req.session.admin) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const { date, time, reason } = req.body;
    
    if (!date || !time) {
      return res.status(400).json({ success: false, error: 'Date and time are required' });
    }

    // Check if slot is already booked
    const [bookings] = await db.promise().query(
      'SELECT COUNT(*) AS count FROM bookings WHERE date = ? AND time = ?',
      [date, time]
    );

    if (bookings[0].count > 0) {
      return res.status(409).json({ 
        success: false, 
        error: 'Cannot block time slot that already has a booking' 
      });
    }

    // Check if slot is already blocked
    const [existing] = await db.promise().query(
      'SELECT COUNT(*) AS count FROM blocked_time_slots WHERE date = ? AND time = ?',
      [date, time]
    );

    if (existing[0].count > 0) {
      return res.status(409).json({ 
        success: false, 
        error: 'Time slot is already blocked' 
      });
    }

    // Add blocked slot
    const [result] = await db.promise().query(
      'INSERT INTO blocked_time_slots (date, time, reason) VALUES (?, ?, ?)',
      [date, time, reason || 'Blocked by admin']
    );

    console.log(`✅ Time slot blocked: ${date} ${time}`);
    res.status(201).json({ 
      success: true, 
      blockedSlotId: result.insertId 
    });

  } catch (error) {
    console.error('❌ Error blocking time slot:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove blocked time slot
app.delete('/api/admin/blocked-slots/:id', async (req, res) => {
  if (!req.session.admin) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const { id } = req.params;
    
    const [result] = await db.promise().query(
      'DELETE FROM blocked_time_slots WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Blocked slot not found' });
    }

    console.log(`✅ Blocked time slot removed: ${id}`);
    res.json({ success: true });

  } catch (error) {
    console.error('❌ Error removing blocked slot:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Available times
app.get('/api/available-times', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ success: false, error: 'Missing date parameter' });

  try {
    // Get booked times
    const [bookedRows] = await db.promise().query('SELECT time FROM bookings WHERE date=?', [date]);
    
    // Get blocked times
    const [blockedRows] = await db.promise().query('SELECT time FROM blocked_time_slots WHERE date=?', [date]);

    // Convert MySQL TIME format to HH:MM format for comparison
    const booked = bookedRows.map(r => {
      const time = r.time;
      if (typeof time === 'string') {
        return time.slice(0, 5);
      } else if (time instanceof Date) {
        return time.toTimeString().slice(0, 5);
      } else {
        return time.toString().slice(0, 5);
      }
    });

    const blocked = blockedRows.map(r => {
      const time = r.time;
      if (typeof time === 'string') {
        return time.slice(0, 5);
      } else if (time instanceof Date) {
        return time.toTimeString().slice(0, 5);
      } else {
        return time.toString().slice(0, 5);
      }
    });

    // Filter out both booked and blocked times
    const unavailable = [...booked, ...blocked];
    const available = ALL_TIME_SLOTS.filter(t => !unavailable.includes(t));
    
    res.json({ success: true, times: available });

  } catch (error) {
    console.error('❌ Error fetching available times:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Booked times (includes both booked and blocked)
app.get('/api/booked-times', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ success: false, error: 'Missing date parameter' });

  try {
    // Get booked times
    const [bookedRows] = await db.promise().query('SELECT time FROM bookings WHERE date=?', [date]);
    
    // Get blocked times
    const [blockedRows] = await db.promise().query('SELECT time FROM blocked_time_slots WHERE date=?', [date]);
    
    // Convert MySQL TIME format to HH:MM format for frontend
    const bookedTimes = bookedRows.map(r => {
      const time = r.time;
      if (typeof time === 'string') {
        return time.slice(0, 5);
      } else if (time instanceof Date) {
        return time.toTimeString().slice(0, 5);
      } else {
        return time.toString().slice(0, 5);
      }
    });

    const blockedTimes = blockedRows.map(r => {
      const time = r.time;
      if (typeof time === 'string') {
        return time.slice(0, 5);
      } else if (time instanceof Date) {
        return time.toString().slice(0, 5);
      } else {
        return time.toString().slice(0, 5);
      }
    });
    
    // Return both booked and blocked times
    const allUnavailable = [...bookedTimes, ...blockedTimes];
    res.json({ success: true, times: allUnavailable });
  } catch (error) {
    console.error('❌ Error fetching booked/blocked times:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running in ${NODE_ENV} mode on port ${PORT}`);
  console.log(`🌐 Frontend URL: ${config.frontendUrl}`);
  console.log(`🔒 Production mode: ${NODE_ENV === 'production'}`);
  
  if (NODE_ENV === 'production') {
    console.log('🚀 Production deployment ready');
    console.log('📝 Remember to set all environment variables in .env.production');
  }
});
