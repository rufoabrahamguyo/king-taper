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

// Create blocked_days table
db.query(`
  CREATE TABLE IF NOT EXISTS blocked_days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    reason VARCHAR(255),
    is_whole_day BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) {
    console.error('Error creating blocked_days table:', err);
  } else {
    console.log('✅ Blocked days table ready');
  }
});

// Create blocked_times table for individual time slots
db.query(`
  CREATE TABLE IF NOT EXISTS blocked_times (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    time_slot TIME NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_blocked_slot (date, time_slot)
  )
`, (err) => {
  if (err) {
    console.error('Error creating blocked_times table:', err);
  } else {
    console.log('✅ Blocked times table ready');
  }
});

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

// Service durations in minutes
const SERVICE_DURATIONS = {
  'Hair Cut': 30,
  'Kids Cut': 30,
  'Coils & Haircut': 90, // 1 hour 30 minutes
  'Barrel Twist': 90,    // 1 hour 30 minutes
  'Home Service': 90,    // 1 hour 30 minutes
  'Hair Color': 60       // 1 hour
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

// Helper function to check if a date/time is blocked
function checkBlockedDay(date, time, db) {
  return new Promise(async (resolve) => {
    try {
      // Convert date to match database format (YYYY-MM-DD)
      const dateStr = date.split('T')[0]; // Remove time part if present
      console.log('🔍 Checking blocked day - input date:', date, 'converted to:', dateStr);
      const [blockedDays] = await db.promise().query(
        'SELECT * FROM blocked_days WHERE DATE(date) = ?',
        [dateStr]
      );
      console.log('🔍 Found blocked days:', blockedDays.length, 'for date:', dateStr);
      
      for (const blockedDay of blockedDays) {
        // If it's a whole day block
        if (blockedDay.is_whole_day) {
          resolve({ blocked: true, reason: blockedDay.reason || 'Day is blocked' });
          return;
        }
        
        // If it's a time range block
        if (blockedDay.start_time && blockedDay.end_time && time) {
          const requestedTime = time;
          const blockedStart = blockedDay.start_time;
          const blockedEnd = blockedDay.end_time;
          
          // Check if requested time falls within blocked time range
          if (requestedTime >= blockedStart && requestedTime < blockedEnd) {
            resolve({ blocked: true, reason: blockedDay.reason || 'Time slot is blocked' });
            return;
          }
        }
      }
      
      resolve({ blocked: false });
    } catch (error) {
      console.error('Error checking blocked day:', error);
      resolve({ blocked: false }); // Allow booking on error
    }
  });
}

// --- ROUTES ---

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

    // Check if it's Tuesday (closed day)
    const selectedDate = new Date(date + 'T00:00:00');
    const dayOfWeek = selectedDate.getDay();
    if (dayOfWeek === 2) {
      return res.status(409).json({ 
        success: false, 
        error: 'We are closed on Tuesdays. Please select another day.' 
      });
    }

    // Check if time slot is already booked (simple check)
    const [existingBooking] = await db.promise().query(
      'SELECT id FROM bookings WHERE date = ? AND time = ?',
      [date, time]
    );
    if (existingBooking.length > 0) {
      return res.status(409).json({ 
        success: false, 
        error: 'Time slot already booked. Please choose another time.' 
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









// Helper function to generate all possible time slots for a day
function generateAllSlots(day) {
  const slots = [];
  const startHour = 9;
  const endHour = 20;
  const interval = 30;
  
  // Get current date and time
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  // Check if the requested day is today
  const isToday = day === today;
  
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      if (hour === endHour && minute > 0) break;
      
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const slotTime = hour * 60 + minute;
      
      // If it's today, only include future time slots (with 15 min buffer)
      if (isToday && slotTime <= (currentTime + 15)) {
        continue; // Skip past time slots
      }
      
      slots.push(timeString);
    }
  }
  return slots;
}

// Helper function to get booked slots for a day
async function getBookedSlots(date, service) {
  const [bookings] = await db.promise().query(
    'SELECT time, service FROM bookings WHERE date = ?',
    [date]
  );
  
  const bookedSlots = new Set();
  
  // Normalize service names for comparison
  const normalizeService = (serviceName) => {
    return serviceName.toLowerCase().replace(/\s+/g, ' ').trim();
  };
  
  const requestedService = normalizeService(service);
  
  // Get the duration of the requested service
  const requestedDuration = SERVICE_DURATIONS[service] || 30;
  
  // Generate all possible slots once
  const allSlots = generateAllSlots(date);
  
  for (const booking of bookings) {
    const bookingStart = booking.time.includes(':') ? booking.time.split(':').slice(0, 2).join(':') : booking.time;
    const bookingService = booking.service;
    
    // Get the duration of the existing booking
    const bookingDuration = SERVICE_DURATIONS[bookingService] || 30;
    const bookingEnd = addMinutesToTime(bookingStart, bookingDuration);
    
    // Check all possible start times for the requested service that would overlap with this booking
    for (const slot of allSlots) {
      const slotStart = slot;
      const slotEnd = addMinutesToTime(slotStart, requestedDuration);
      
      // Check if this slot would overlap with the existing booking
      if (slotStart < bookingEnd && slotEnd > bookingStart) {
        bookedSlots.add(slot);
      }
    }
  }
  
  return Array.from(bookedSlots);
}

// Helper function to get blocked slots for a day
async function getBlockedSlots(date) {
  // Get blocked individual time slots
  const [blockedTimes] = await db.promise().query(
    'SELECT time_slot FROM blocked_times WHERE date = ?',
    [date]
  );
  
  // Get blocked time ranges and convert to individual slots
  const [blockedRanges] = await db.promise().query(
    'SELECT start_time, end_time FROM blocked_days WHERE date = ? AND is_whole_day = FALSE',
    [date]
  );
  
  const blockedSlots = new Set();
  
  // Add individual blocked time slots
  for (const blocked of blockedTimes) {
    const timeSlot = blocked.time_slot.includes(':') ? 
      blocked.time_slot.split(':').slice(0, 2).join(':') : blocked.time_slot;
    blockedSlots.add(timeSlot);
  }
  
  // Add blocked time ranges
  for (const range of blockedRanges) {
    if (range.start_time && range.end_time) {
      let currentTime = range.start_time.includes(':') ? 
        range.start_time.split(':').slice(0, 2).join(':') : range.start_time;
      const endTime = range.end_time.includes(':') ? 
        range.end_time.split(':').slice(0, 2).join(':') : range.end_time;
      
      while (currentTime < endTime) {
        blockedSlots.add(currentTime);
        currentTime = addMinutesToTime(currentTime, 30);
      }
    }
  }
  
  return Array.from(blockedSlots);
}

// Available times - SIMPLIFIED - Only use bookings table
app.get('/api/available-times', async (req, res) => {
  const { date, service } = req.query;
  if (!date) return res.status(400).json({ success: false, error: 'Missing date parameter' });
  if (!service) return res.status(400).json({ success: false, error: 'Missing service parameter' });

  try {
    console.log(`🔍 Checking available times for date: ${date}, service: ${service}`);

    // Check if it's Tuesday (hardcoded closed day)
    const selectedDate = new Date(date + 'T00:00:00');
    const dayOfWeek = selectedDate.getDay();
    if (dayOfWeek === 2) {
      console.log(`❌ Tuesday - We are closed`);
      return res.json({ 
        success: true, 
        times: [], 
        blocked: true, 
        reason: 'We are closed on Tuesdays' 
      });
    }

    // Generate all possible time slots for the day
    const allSlots = generateAllSlots(date);
    console.log(`📋 Generated ${allSlots.length} possible time slots`);

    // Get booked slots from bookings table only
    const [bookings] = await db.promise().query(
      'SELECT time FROM bookings WHERE date = ?',
      [date]
    );
    
    const bookedTimes = bookings.map(b => b.time);
    console.log(`📅 Found ${bookedTimes.length} booked slots:`, bookedTimes);

    // Filter out booked slots to get available slots
    const available = allSlots.filter(slot => !bookedTimes.includes(slot));
    
    console.log(`✅ Final result: ${available.length} available slots out of ${allSlots.length} total slots`);
    
    // Return available slots
    res.json({ success: true, times: available });

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
      // For 90-minute services, block the full duration
      let currentTime = startTime;
      const endTime = addMinutesToTime(startTime, duration);
      
      while (currentTime < endTime) {
        blockedSlots.add(currentTime);
        currentTime = addMinutesToTime(currentTime, BUSINESS_HOURS.interval);
      }
    }
    
    const blockedTimes = Array.from(blockedSlots).sort();
    
    // Convert times to HH:MM format (remove seconds) for frontend compatibility
    const formattedTimes = blockedTimes.map(time => {
      if (typeof time === 'string' && time.includes(':')) {
        return time.split(':').slice(0, 2).join(':');
      }
      return time;
    });
    
    console.log(`📅 Date: ${date}, Blocked times:`, formattedTimes);
    res.json({ success: true, times: formattedTimes });
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

// 404 handler - only for API routes, not static files
// Blocked Days API endpoints
app.get('/api/admin/blocked-days', async (req, res) => {
  if (!req.session.admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  try {
    const [blockedDays] = await db.promise().query(
      'SELECT * FROM blocked_days ORDER BY date DESC, start_time ASC'
    );
    res.json({ success: true, blockedDays });
  } catch (error) {
    console.error('❌ Error fetching blocked days:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/blocked-days', async (req, res) => {
  if (!req.session.admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  const { date, startTime, endTime, reason, isWholeDay } = req.body;
  
  if (!date) {
    return res.status(400).json({ success: false, error: 'Date is required' });
  }
  
  try {
    await db.promise().query(
      'INSERT INTO blocked_days (date, start_time, end_time, reason, is_whole_day) VALUES (?, ?, ?, ?, ?)',
      [date, startTime || null, endTime || null, reason || null, isWholeDay || false]
    );
    
    res.json({ success: true, message: 'Blocked day added successfully' });
  } catch (error) {
    console.error('❌ Error adding blocked day:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/admin/blocked-days/:id', async (req, res) => {
  if (!req.session.admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  const { id } = req.params;
  const { date, startTime, endTime, reason, isWholeDay } = req.body;
  
  try {
    await db.promise().query(
      'UPDATE blocked_days SET date = ?, start_time = ?, end_time = ?, reason = ?, is_whole_day = ? WHERE id = ?',
      [date, startTime || null, endTime || null, reason || null, isWholeDay || false, id]
    );
    
    res.json({ success: true, message: 'Blocked day updated successfully' });
  } catch (error) {
    console.error('❌ Error updating blocked day:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/blocked-days/:id', async (req, res) => {
  if (!req.session.admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
  
  const { id } = req.params;
  
  try {
    await db.promise().query('DELETE FROM blocked_days WHERE id = ?', [id]);
    res.json({ success: true, message: 'Blocked day deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting blocked day:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Blocked Times API endpoints
app.get('/api/admin/blocked-times', async (req, res) => {
  if (!req.session.admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    const { date } = req.query;
    let sql = 'SELECT * FROM blocked_times';
    const params = [];
    
    if (date) {
      sql += ' WHERE date = ?';
      params.push(date);
    }
    
    sql += ' ORDER BY date DESC, time_slot ASC';
    
    const [blockedTimes] = await db.promise().query(sql, params);
    res.json({ success: true, blockedTimes });
  } catch (error) {
    console.error('❌ Error fetching blocked times:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/blocked-times', async (req, res) => {
  if (!req.session.admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    const { date, time_slot, reason } = req.body;
    
    if (!date || !time_slot) {
      return res.status(400).json({ success: false, error: 'Date and time_slot are required' });
    }
    
    await db.promise().query(
      'INSERT INTO blocked_times (date, time_slot, reason) VALUES (?, ?, ?)',
      [date, time_slot, reason || 'Blocked by admin']
    );
    
    res.json({ success: true, message: 'Blocked time added successfully' });
  } catch (error) {
    console.error('❌ Error adding blocked time:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/admin/blocked-times/:id', async (req, res) => {
  if (!req.session.admin) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try {
    const { id } = req.params;
    await db.promise().query('DELETE FROM blocked_times WHERE id = ?', [id]);
    res.json({ success: true, message: 'Blocked time deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting blocked time:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'API route not found' });
});

// Serve admin.html for admin route
app.get('/admin', (req, res) => {
  res.sendFile('admin.html', { root: '.' });
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: '.' });
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

// Debug endpoint to check bookings
app.get('/api/debug-bookings/:date', async (req, res) => {
  const { date } = req.params;
  try {
    const [bookings] = await db.promise().query('SELECT * FROM bookings WHERE date = ?', [date]);
    res.json({ success: true, bookings, count: bookings.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint to clear test bookings
app.delete('/api/debug-clear/:date', async (req, res) => {
  const { date } = req.params;
  try {
    const [result] = await db.promise().query('DELETE FROM bookings WHERE date = ?', [date]);
    res.json({ success: true, deleted: result.affectedRows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
