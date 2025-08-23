// server.js

// 1) Load environment variables from the right file
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require('dotenv').config({ path: envFile });
console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`📁 Config file: ${envFile}`);

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

// Production security headers
if (NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
}

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
  },
  store: NODE_ENV === 'production' ? undefined : undefined // Use default store for now
}));

// 4) Session logging (only in development)
if (NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log('Session:', req.session);
    next();
  });
}

// 5) MySQL connection pool
const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT
});

// Test database connection
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    if (NODE_ENV !== 'production') {
      console.error('🔍 Environment variables:');
      console.error('  MYSQLHOST:', process.env.MYSQLHOST);
      console.error('  MYSQLUSER:', process.env.MYSQLUSER);
      console.error('  MYSQLDATABASE:', process.env.MYSQLDATABASE);
      console.error('  MYSQLPORT:', process.env.MYSQLPORT);
      console.error('  NODE_ENV:', process.env.NODE_ENV);
    }
  } else {
    console.log('✅ Database connected successfully');
    if (NODE_ENV !== 'production') {
      console.log('  Host:', process.env.MYSQLHOST);
      console.log('  Database:', process.env.MYSQLDATABASE);
    }
    connection.release();
  }
});



// Ensure unique constraint on bookings (date, time)
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

// Add database index for faster date queries (MySQL 5.7+ compatible)
db.query(
  `SHOW INDEX FROM bookings WHERE Key_name = 'idx_bookings_date'`,
  (err, results) => {
    if (err) {
      console.error('❌ Could not check date index:', err);
    } else if (results.length === 0) {
      // Index doesn't exist, add it
      db.query(
        `CREATE INDEX idx_bookings_date ON bookings (date)`,
        (addErr) => {
          if (addErr) {
            console.error('❌ Could not add date index to bookings:', addErr);
          } else {
            console.log('✅ Date index on bookings table added.');
          }
        }
      );
    } else {
      console.log('✅ Date index on bookings table already exists.');
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









// Available times - OPTIMIZED VERSION
app.get('/api/available-times', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ success: false, error: 'Missing date parameter' });

  try {
    // Get only booked times for the date
    const [bookings] = await db.promise().query(
      'SELECT time FROM bookings WHERE date = ?',
      [date]
    );

    // Convert MySQL TIME format to HH:MM format for comparison
    const unavailable = bookings.map(r => {
      const time = r.time;
      if (typeof time === 'string') {
        // Handle MySQL TIME format (HH:MM:SS or HH:MM)
        return time.slice(0, 5); // Extract HH:MM part
      } else if (time instanceof Date) {
        // Handle Date objects
        return time.toTimeString().slice(0, 5);
      } else {
        // Handle other formats
        return time.toString().slice(0, 5);
      }
    });

    // Filter out booked times
    const available = ALL_TIME_SLOTS.filter(t => !unavailable.includes(t));
    
    console.log(`📅 Date: ${date}, Available times:`, available);
    res.json({ success: true, times: available });

  } catch (error) {
    console.error('❌ Error fetching available times:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Booked times - OPTIMIZED VERSION
app.get('/api/booked-times', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ success: false, error: 'Missing date parameter' });

  try {
    // Get only booked times for the date
    const [bookings] = await db.promise().query(
      'SELECT time FROM bookings WHERE date = ?',
      [date]
    );
    
    // Convert MySQL TIME format to HH:MM format for frontend
    const unavailableTimes = bookings.map(r => {
      const time = r.time;
      if (typeof time === 'string') {
        // Handle MySQL TIME format (HH:MM:SS or HH:MM)
        return time.slice(0, 5); // Extract HH:MM part
      } else if (time instanceof Date) {
        // Handle Date objects
        return time.toTimeString().slice(0, 5);
      } else {
        // Handle other formats
        return time.toString().slice(0, 5);
      }
    });
    
    console.log(`📅 Date: ${date}, Booked times:`, unavailableTimes);
    res.json({ success: true, times: unavailableTimes });
  } catch (error) {
    console.error('❌ Error fetching booked times:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint to check time column values
app.get('/api/debug/times/:date', async (req, res) => {
  const { date } = req.params;
  
  try {
    // Get raw time values from database
    const [bookings] = await db.promise().query('SELECT time, date FROM bookings WHERE date = ?', [date]);
    
    res.json({
      success: true,
      date: date,
      bookings: bookings.map(b => ({
        rawTime: b.time,
        timeType: typeof b.time,
        convertedTime: b.time ? b.time.toString().slice(0, 5) : null
      }))
    });
  } catch (error) {
    console.error('❌ Debug error:', error);
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
    console.log(`🌐 Custom Domain: ${process.env.CUSTOM_DOMAIN || 'Not set'}`);
    console.log(`🔗 API Base URL: ${config.apiBaseUrl}`);
    console.log('📝 Remember to set all environment variables in Railway dashboard');
  }
});
