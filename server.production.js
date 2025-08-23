// server.production.js - Production-optimized server configuration

// Load environment variables
require('dotenv').config({ path: '.env.production' });

// Explicitly set Railway production configuration
process.env.MYSQLHOST = 'shinkansen.proxy.rlwy.net';
process.env.MYSQLUSER = 'root';
process.env.MYSQLDATABASE = 'railway';
process.env.MYSQLPORT = '32855';
process.env.NODE_ENV = 'production';

const NODE_ENV = process.env.NODE_ENV || 'production';

// Core dependencies
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const config = require('./config');

const app = express();

// Production security configuration
app.set('trust proxy', 1);

const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving with cache headers
app.use(express.static('.', {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else if (path.endsWith('.js')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.gif')) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
  }
}));

// Session configuration
app.use(session({
  name: 'kingtaper.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === 'production' && process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: NODE_ENV === 'production' && process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Database connection pool with proper options
const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

// Test database connection
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.log('⚠️  Database not available - some features will be limited');
    console.log('   Set up your database or use development server for full functionality');
  } else {
    console.log('✅ Database connected successfully');
    connection.release();
  }
});

// Business hours - 40-minute intervals
const ALL_TIME_SLOTS = [
  "09:00", "09:40", "10:20", "11:00", "11:40", "12:20",
  "13:00", "13:40", "14:20", "15:00", "15:40", "16:20",
  "17:00", "17:40", "18:20", "19:00", "19:40", "20:20", "21:00"
];

// Ensure database constraints (only if database is connected)
if (db) {
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

  // Add database index for faster date queries
  db.query(
    `SHOW INDEX FROM bookings WHERE Key_name = 'idx_bookings_date'`,
    (err, results) => {
      if (err) {
        console.error('❌ Could not check date index:', err);
      } else if (results.length === 0) {
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
}

// API Routes
// Booking creation
app.post('/api/book', async (req, res) => {
  if (!db) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }

  const { name, email, phone, service, price, date, time, message } = req.body;
  
  if (!name || !phone || !service || !price || !date || !time) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    // Check if time slot is available
    const [checkResults] = await db.promise().query(
      'SELECT COUNT(*) AS count FROM bookings WHERE date=? AND time=?', 
      [date, time]
    );
    
    if (checkResults[0].count > 0) {
      return res.status(409).json({ success: false, error: 'Time slot already booked' });
    }

    // Create booking
    const [insertResult] = await db.promise().query(
      `INSERT INTO bookings (name,email,phone,service,price,date,time,message) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, phone, service, price, date, time, message]
    );

    res.status(201).json({ 
      success: true, 
      bookingId: insertResult.insertId 
    });

  } catch (error) {
    console.error('❌ Error creating booking:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
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
    res.clearCookie('kingtaper.sid', { path: '/' });
    res.json({ success: true });
  });
});

// Admin session check
app.get('/api/admin/check', (req, res) => {
  res.json({ loggedIn: !!req.session.admin });
});

// Get bookings (admin only)
app.get('/api/admin/bookings', (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  if (!db) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }
  
  const { start, end } = req.query;
  let sql = 'SELECT * FROM bookings';
  const params = [];

  if (start && end) {
    sql += ' WHERE date BETWEEN ? AND ?';
    params.push(start, end);
  }

  sql += ' ORDER BY id DESC';
  
  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: 'Database error' });
    res.json({ success: true, bookings: rows });
  });
});

// Update booking (admin only)
app.put('/api/admin/bookings/:id', async (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (!db) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }

  const { id } = req.params;
  const { name, email, phone, service, price, date, time, message } = req.body;

  try {
    await db.promise().query(
      `UPDATE bookings SET name=?, email=?, phone=?, service=?, price=?, date=?, time=?, message=? WHERE id=?`,
      [name, email, phone, service, price, date, time, message, id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating booking:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Delete booking (admin only)
app.delete('/api/admin/bookings/:id', async (req, res) => {
  if (!req.session.admin) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (!db) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }

  try {
    await db.promise().query('DELETE FROM bookings WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting booking:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Available times
app.get('/api/available-times', async (req, res) => {
  if (!db) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }

  const { date } = req.query;
  if (!date) return res.status(400).json({ success: false, error: 'Missing date parameter' });

  try {
    const [bookings] = await db.promise().query(
      'SELECT time FROM bookings WHERE date = ?',
      [date]
    );

    const unavailable = bookings.map(r => r.time.toString().slice(0, 5));
    const available = ALL_TIME_SLOTS.filter(t => !unavailable.includes(t));
    
    res.json({ success: true, times: available });
  } catch (error) {
    console.error('❌ Error fetching available times:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Booked times
app.get('/api/booked-times', async (req, res) => {
  if (!db) {
    return res.status(503).json({ success: false, error: 'Database not available' });
  }

  const { date } = req.query;
  if (!date) return res.status(400).json({ success: false, error: 'Missing date parameter' });

  try {
    const [bookings] = await db.promise().query(
      'SELECT time FROM bookings WHERE date = ?',
      [date]
    );
    
    const unavailableTimes = bookings.map(r => r.time.toString().slice(0, 5));
    res.json({ success: true, times: unavailableTimes });
  } catch (error) {
    console.error('❌ Error fetching booked times:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
    database: db ? 'connected' : 'disconnected'
  });
});

// Route handlers
app.get('/admin', (req, res) => {
  res.sendFile('admin.html', { root: '.' });
});

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: '.' });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'API route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Production server running on port ${PORT}`);
  console.log(`🌐 Environment: ${NODE_ENV}`);
  console.log(`🔒 Security: Enabled`);
  console.log(`📊 Rate limiting: Enabled`);
  console.log(`🗜️ Compression: Enabled`);
  console.log(`📁 Frontend URL: ${config.frontendUrl}`);
  console.log(`🔗 API Base URL: ${config.apiBaseUrl}`);
  console.log(`💾 Database: ${db ? 'Available' : 'Not available'}`);
});
