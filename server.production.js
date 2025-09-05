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

// Service durations in minutes
const SERVICE_DURATIONS = {
  'Hair Cut': 30,
  'Kids Cut': 30,
  'Coils & Haircut': 30,
  'Barrel Twist': 120, // 2 hours
  'Home Service': 120, // 2 hours
  'Hair Color': 60     // 1 hour
};

// Business hours - 30-minute intervals for maximum flexibility
const BUSINESS_HOURS = {
  start: '09:00',
  end: '21:00',
  interval: 30 // minutes
};

// Generate all possible time slots
function generateTimeSlots() {
  const slots = [];
  const startHour = parseInt(BUSINESS_HOURS.start.split(':')[0]);
  const startMinute = parseInt(BUSINESS_HOURS.start.split(':')[1]);
  const endHour = parseInt(BUSINESS_HOURS.end.split(':')[0]);
  const endMinute = parseInt(BUSINESS_HOURS.end.split(':')[1]);
  
  let currentHour = startHour;
  let currentMinute = startMinute;
  
  while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
    const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    slots.push(timeString);
    
    currentMinute += BUSINESS_HOURS.interval;
    if (currentMinute >= 60) {
      currentMinute = 0;
      currentHour++;
    }
  }
  
  return slots;
}

const ALL_TIME_SLOTS = generateTimeSlots();

// Helper function to add minutes to a time string
function addMinutesToTime(timeString, minutes) {
  const [hours, mins] = timeString.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}

// Helper function to check if a time slot conflicts with existing bookings
function checkTimeSlotConflict(date, startTime, service, db) {
  return new Promise(async (resolve) => {
    try {
      const duration = SERVICE_DURATIONS[service] || 30;
      const endTime = addMinutesToTime(startTime, duration);
      
      // Get all bookings for the date
      const [bookings] = await db.promise().query(
        'SELECT time, service FROM bookings WHERE date = ?',
        [date]
      );
      
      // Check for conflicts
      for (const booking of bookings) {
        const bookingStart = booking.time;
        const bookingService = booking.service;
        const bookingDuration = SERVICE_DURATIONS[bookingService] || 30;
        const bookingEnd = addMinutesToTime(bookingStart, bookingDuration);
        
        // Check if times overlap
        if (
          (startTime < bookingEnd && endTime > bookingStart) ||
          (bookingStart < endTime && bookingEnd > startTime)
        ) {
          resolve(true); // Conflict found
        }
      }
      
      resolve(false); // No conflict
    } catch (error) {
      console.error('Error checking time slot conflict:', error);
      resolve(true); // Assume conflict on error for safety
    }
  });
}

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
// Booking creation - UPDATED with duration-aware logic
app.post('/api/book', async (req, res) => {
  const { name, email, phone, service, price, date, time, message } = req.body;
  if (!name || !phone || !service || !price || !date || !time) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    // Check if the date is in the past
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot book appointments in the past. Please select a future date.' 
      });
    }

    // Check if the time slot is in the past (for today's bookings)
    if (date === today) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [hours, minutes] = time.split(':').map(Number);
      const slotTime = hours * 60 + minutes;
      
      // Add 15 minutes buffer to prevent very tight bookings
      if (slotTime <= (currentTime + 15)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Cannot book appointments in the past. Please select a future time slot.' 
        });
      }
    }

    // Check if time slot conflicts with existing bookings
    const hasConflict = await checkTimeSlotConflict(date, time, service, db);
    if (hasConflict) {
      return res.status(409).json({ 
        success: false, 
        error: 'Time slot conflicts with existing booking. Please choose another time.' 
      });
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

// Available times - UPDATED with duration-aware logic
app.get('/api/available-times', async (req, res) => {
  const { date, service } = req.query;
  if (!date) return res.status(400).json({ success: false, error: 'Missing date parameter' });
  if (!service) return res.status(400).json({ success: false, error: 'Missing service parameter' });

  try {
    // Get all bookings for the date
    const [bookings] = await db.promise().query(
      'SELECT time, service FROM bookings WHERE date = ?',
      [date]
    );
    
    // Filter out conflicting time slots and past times
    const availableSlots = ALL_TIME_SLOTS.filter(slot => {
      // Check if this slot is in the past (for today's bookings)
      const today = new Date().toISOString().split('T')[0];
      if (date === today) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [hours, minutes] = slot.split(':').map(Number);
        const slotTime = hours * 60 + minutes;
        
        // Add 15 minutes buffer to prevent very tight bookings
        if (slotTime <= (currentTime + 15)) {
          return false; // Skip past time slots
        }
      }
      
      // Check if this slot conflicts with any existing booking
      for (const booking of bookings) {
        const bookingStart = booking.time.includes(':') ? booking.time.split(':').slice(0, 2).join(':') : booking.time;
        const bookingService = booking.service;
        const bookingDuration = SERVICE_DURATIONS[bookingService] || SERVICE_DURATIONS[service] || 30;
        const bookingEnd = addMinutesToTime(bookingStart, bookingDuration);
        
        const requestedDuration = SERVICE_DURATIONS[service] || 30;
        const requestedEnd = addMinutesToTime(slot, requestedDuration);
        
        // Check for overlap
        if (slot < bookingEnd && requestedEnd > bookingStart) {
          return false; // Slot conflicts
        }
      }
      return true; // Slot is available
    });
    
    console.log(`📅 Date: ${date}, Service: ${service}, Available times:`, availableSlots);
    res.json({ success: true, times: availableSlots });

  } catch (error) {
    console.error('❌ Error fetching available times:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Booked times - UPDATED with duration-aware logic
app.get('/api/booked-times', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ success: false, error: 'Missing date parameter' });

  try {
    // Get all bookings for the date with their durations
    const [bookings] = await db.promise().query(
      'SELECT time, service FROM bookings WHERE date = ?',
      [date]
    );
    
    // Generate all blocked time slots based on service durations
    const blockedSlots = new Set();
    
    for (const booking of bookings) {
      const startTime = booking.time;
      const service = booking.service;
      const duration = SERVICE_DURATIONS[service] || 30;
      
      // Add all time slots that are blocked by this booking
      let currentTime = startTime;
      for (let i = 0; i < duration; i += BUSINESS_HOURS.interval) {
        blockedSlots.add(currentTime);
        currentTime = addMinutesToTime(currentTime, BUSINESS_HOURS.interval);
      }
    }
    
    const blockedTimes = Array.from(blockedSlots).sort();
    
    console.log(`📅 Date: ${date}, Blocked times:`, blockedTimes);
    res.json({ success: true, times: blockedTimes });
  } catch (error) {
    console.error('❌ Error fetching booked times:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// New endpoint to get service duration
app.get('/api/service-duration/:service', (req, res) => {
  const { service } = req.params;
  const duration = SERVICE_DURATIONS[service] || 30;
  res.json({ success: true, service, duration });
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
