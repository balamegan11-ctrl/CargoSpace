const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const Database = require('better-sqlite3')
const path = require('path')
const http = require('http')
const { Server } = require('socket.io')

dotenv.config()

const app = express()
const port = process.env.PORT || 5000
const appPort = Number(process.env.APP_PORT || 5173)
const db = new Database(path.join(__dirname, 'cargospace.db'))
const httpServer = http.createServer(app)

// Accept any localhost/127.0.0.1 port: socket.io connects straight to this server
// (bypassing the Vite proxy), so pinning one port silently breaks a second
// dev server running on 5174/5175.
const corsOrigin = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/
const io = new Server(httpServer, { cors: { origin: corsOrigin, credentials: true } })

app.use(cors({ origin: corsOrigin, credentials: true }))
app.use(express.json())

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      alternate_name TEXT,
      company TEXT,
      phone TEXT,
      location TEXT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS legacy_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'legacy',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id TEXT UNIQUE NOT NULL,
      user_id TEXT,
      container_id TEXT NOT NULL,
      route TEXT NOT NULL,
      space INTEGER NOT NULL,
      status TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'PENDING',
      cancellation_reason TEXT,
      cancelled_at TEXT,
      refund_status TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
      refund_amount INTEGER,
      refunded_at TEXT,
      booking_date TEXT NOT NULL,
      slot_start_time TEXT,
      slot_end_time TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      customer_email TEXT,
      cargo_center_name TEXT,
      provider_name TEXT,
      vehicle_number TEXT,
      customer_vehicle_number TEXT,
      price_per_cbm INTEGER,
      subtotal INTEGER,
      taxes_fees INTEGER,
      payment_date TEXT,
      payment_method TEXT,
      amount INTEGER NOT NULL,
      receipt_number TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT UNIQUE NOT NULL,
      booking_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      read_status INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reset_token TEXT UNIQUE NOT NULL,
      identifier TEXT NOT NULL,
      type TEXT NOT NULL,
      user_id TEXT NOT NULL,
      otp TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  const bookingColumns = db.prepare('PRAGMA table_info(bookings)').all().map((column) => column.name)
  if (!bookingColumns.includes('payment_status')) db.exec("ALTER TABLE bookings ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'PENDING'")
  if (!bookingColumns.includes('cancellation_reason')) db.exec('ALTER TABLE bookings ADD COLUMN cancellation_reason TEXT')
  if (!bookingColumns.includes('cancelled_at')) db.exec('ALTER TABLE bookings ADD COLUMN cancelled_at TEXT')
  if (!bookingColumns.includes('slot_start_time')) db.exec('ALTER TABLE bookings ADD COLUMN slot_start_time TEXT')
  if (!bookingColumns.includes('slot_end_time')) db.exec('ALTER TABLE bookings ADD COLUMN slot_end_time TEXT')
  if (!bookingColumns.includes('refund_status')) db.exec("ALTER TABLE bookings ADD COLUMN refund_status TEXT NOT NULL DEFAULT 'NOT_APPLICABLE'")
  if (!bookingColumns.includes('refund_amount')) db.exec('ALTER TABLE bookings ADD COLUMN refund_amount INTEGER')
  if (!bookingColumns.includes('refunded_at')) db.exec('ALTER TABLE bookings ADD COLUMN refunded_at TEXT')
  if (!bookingColumns.includes('customer_name')) db.exec('ALTER TABLE bookings ADD COLUMN customer_name TEXT')
  if (!bookingColumns.includes('customer_phone')) db.exec('ALTER TABLE bookings ADD COLUMN customer_phone TEXT')
  if (!bookingColumns.includes('customer_email')) db.exec('ALTER TABLE bookings ADD COLUMN customer_email TEXT')
  if (!bookingColumns.includes('cargo_center_name')) db.exec('ALTER TABLE bookings ADD COLUMN cargo_center_name TEXT')
  if (!bookingColumns.includes('provider_name')) db.exec('ALTER TABLE bookings ADD COLUMN provider_name TEXT')
  if (!bookingColumns.includes('vehicle_number')) db.exec('ALTER TABLE bookings ADD COLUMN vehicle_number TEXT')
  if (!bookingColumns.includes('customer_vehicle_number')) db.exec('ALTER TABLE bookings ADD COLUMN customer_vehicle_number TEXT')
  if (!bookingColumns.includes('price_per_cbm')) db.exec('ALTER TABLE bookings ADD COLUMN price_per_cbm INTEGER')
  if (!bookingColumns.includes('subtotal')) db.exec('ALTER TABLE bookings ADD COLUMN subtotal INTEGER')
  if (!bookingColumns.includes('taxes_fees')) db.exec('ALTER TABLE bookings ADD COLUMN taxes_fees INTEGER')
  if (!bookingColumns.includes('payment_date')) db.exec('ALTER TABLE bookings ADD COLUMN payment_date TEXT')
  if (!bookingColumns.includes('payment_method')) db.exec('ALTER TABLE bookings ADD COLUMN payment_method TEXT')

  const userColumns = db.prepare('PRAGMA table_info(users)').all().map((column) => column.name)
  if (!userColumns.includes('alternate_name')) db.exec('ALTER TABLE users ADD COLUMN alternate_name TEXT')
  if (!userColumns.includes('company')) db.exec('ALTER TABLE users ADD COLUMN company TEXT')
  if (!userColumns.includes('phone')) db.exec('ALTER TABLE users ADD COLUMN phone TEXT')
  if (!userColumns.includes('location')) db.exec('ALTER TABLE users ADD COLUMN location TEXT')
  if (!userColumns.includes('latitude')) db.exec('ALTER TABLE users ADD COLUMN latitude REAL')
  if (!userColumns.includes('longitude')) db.exec('ALTER TABLE users ADD COLUMN longitude REAL')
  if (!userColumns.includes('user_type')) db.exec("ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'Trader / Exporter / Importer'")
  if (!userColumns.includes('transport_mode')) db.exec('ALTER TABLE users ADD COLUMN transport_mode TEXT')
  if (!userColumns.includes('cargo_center_name')) db.exec('ALTER TABLE users ADD COLUMN cargo_center_name TEXT')
  if (!userColumns.includes('route')) db.exec('ALTER TABLE users ADD COLUMN route TEXT')
  if (!userColumns.includes('total_cbm')) db.exec('ALTER TABLE users ADD COLUMN total_cbm INTEGER')
  if (!userColumns.includes('available_cbm')) db.exec('ALTER TABLE users ADD COLUMN available_cbm INTEGER')
  if (!userColumns.includes('price_per_cbm')) db.exec('ALTER TABLE users ADD COLUMN price_per_cbm INTEGER')
  if (!userColumns.includes('vehicle_info')) db.exec('ALTER TABLE users ADD COLUMN vehicle_info TEXT')
  if (!userColumns.includes('vehicle_number')) db.exec('ALTER TABLE users ADD COLUMN vehicle_number TEXT')
  if (!userColumns.includes('service_description')) db.exec('ALTER TABLE users ADD COLUMN service_description TEXT')
  if (!userColumns.includes('approval_status')) db.exec("ALTER TABLE users ADD COLUMN approval_status TEXT DEFAULT 'approved'")
  if (!userColumns.includes('inspection_notes')) db.exec('ALTER TABLE users ADD COLUMN inspection_notes TEXT')
}

createTables()

function ensureSampleAdmin() {
  const existing = db.prepare('SELECT 1 FROM admins WHERE email = ?').get('admin@cargospace.com')
  if (!existing) {
    const sampleAdminId = 'ADM-SAMPLE-001'
    db.prepare(`
      INSERT INTO admins (admin_id, name, email, password, role, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(sampleAdminId, 'CargoSpace Admin', 'admin@cargospace.com', 'admin123', 'admin', 'active')
    console.log('Sample admin inserted with ID:', sampleAdminId)
  }
}

ensureSampleAdmin()

function ensureSampleUser() {
  const existing = db.prepare('SELECT user_id FROM users WHERE email = ?').get('trader@cargospace.com')
  if (existing) {
    db.prepare("UPDATE users SET phone = COALESCE(NULLIF(phone, ''), ?) WHERE user_id = ?")
      .run('+91 98765 43210', existing.user_id)
    return existing.user_id
  }
  const sampleUserId = 'USR-SAMPLE-001'
  db.prepare(`
    INSERT INTO users (user_id, name, email, password, role, user_type, phone, company, location, approval_status, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(sampleUserId, 'Ananya Mehta', 'trader@cargospace.com', 'password', 'user', 'Trader / Exporter / Importer', '+91 98765 43210', 'Mehta Export House', 'Mumbai, Maharashtra', 'approved', 'active')
  console.log('Sample user inserted with ID:', sampleUserId)
  return sampleUserId
}

const sampleUserId = ensureSampleUser()

function ensureSampleProvider() {
  const existing = db.prepare('SELECT user_id FROM users WHERE email = ?').get('provider@cargospace.com')
  if (existing) {
    db.prepare("UPDATE users SET approval_status = 'Approved', vehicle_number = COALESCE(NULLIF(vehicle_number, ''), ?) WHERE user_id = ?")
      .run('TN 01 AB 2024', existing.user_id)
    return existing.user_id
  }
  const sampleProviderId = 'PRV-SAMPLE-001'
  db.prepare(`
    INSERT INTO users (user_id, name, email, password, role, user_type, phone, company, location, transport_mode, cargo_center_name, route, total_cbm, available_cbm, price_per_cbm, vehicle_info, service_description, approval_status, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sampleProviderId,
    'Vikram Malhotra',
    'provider@cargospace.com',
    'password',
    'provider',
    'Logistics Service Provider (Road / Rail / Ship / Air)',
    '+91 98123 45678',
    'Express Roadways Logistics',
    'Chennai',
    'Road',
    'Chennai Cargo Logistics Depot',
    'Chennai → Mumbai',
    500,
    320,
    500,
    'Fleet of 24 multi-axle 40ft container carriers with GPS tracking',
    'Full and partial truckload consolidation across South-West corridor with daily departures.',
    'Approved',
    'active'
  )
  console.log('Sample provider inserted with ID:', sampleProviderId)
  return sampleProviderId
}

const sampleProviderId = ensureSampleProvider()

function ensureSampleBookings() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM bookings').get().count
  if (count > 0) return

  const insert = db.prepare(`
    INSERT INTO bookings (booking_id, user_id, container_id, route, space, status, payment_status, booking_date, amount, receipt_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const sampleBookings = [
    ['BK-4412', sampleUserId, 'CS-MUM-2041', 'Mumbai → Ahmedabad', 4, 'Confirmed', 'PAID', '2026-09-04', 6200, 'CS-BK-4412'],
    ['BK-4418', null, 'CS-BLR-0904', 'Bengaluru → Hyderabad', 2, 'In Transit', 'PAID', '2026-09-03', 9200, 'CS-BK-4418'],
    ['BK-4420', null, 'CS-DEL-1188', 'Delhi → Kolkata', 6, 'Pending', 'PENDING', '2026-09-02', 8100, 'CS-BK-4420'],
  ]
  const insertMany = db.transaction((rows) => rows.forEach((row) => insert.run(...row)))
  insertMany(sampleBookings)
}

ensureSampleBookings()

db.prepare("UPDATE bookings SET user_id = ?, payment_status = 'PAID', status = 'Confirmed' WHERE booking_id = 'BK-4412' AND (user_id IS NULL OR user_id = ?)").run(sampleUserId, sampleUserId)

function generateUserId(prefix = 'CS') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

function getIdentity(req) {
  const userId = req.headers['x-user-id']
  const adminId = req.headers['x-admin-id']
  if (adminId) {
    const admin = db.prepare('SELECT admin_id AS id, name, email, role FROM admins WHERE admin_id = ? AND status = ?').get(adminId, 'active')
    return admin ? { ...admin, role: 'admin' } : null
  }
  if (userId) {
    const user = db.prepare('SELECT user_id AS id, name, alternate_name, company, phone, location, email, role, user_type, approval_status FROM users WHERE user_id = ? AND status = ?').get(userId, 'active')
    return user ? { ...user, role: user.role || 'user' } : null
  }
  return null
}

function requireIdentity(req, res, role) {
  const identity = getIdentity(req)
  if (!identity || (role && identity.role !== role)) {
    res.status(401).json({ success: false, message: 'Please sign in to continue.' })
    return null
  }
  return identity
}

function getPaidBooking(bookingId, identity) {
  const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(bookingId)
  if (!booking || booking.payment_status !== 'PAID' || !['Confirmed', 'In Transit'].includes(booking.status)) return null
  if (identity.role === 'user' && booking.user_id !== identity.id) return null
  if (identity.role === 'provider' && booking.container_id !== `CS-PRV-${identity.id.slice(-6)}`) return null
  return booking
}

function getProviderIdForBooking(booking) {
  if (!booking?.container_id?.startsWith('CS-PRV-')) return null
  return db.prepare("SELECT user_id FROM users WHERE role = 'provider' AND substr(user_id, -6) = ?").get(booking.container_id.slice(-6))?.user_id || null
}

function serializeMessage(message) {
  return { ...message, read_status: Boolean(message.read_status) }
}

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'CargoSpace backend is working',
  })
})

const toOptionalText = (value) => String(value || '').trim() || null

app.post('/api/register', (req, res) => {
  const {
    name,
    alternateName,
    company,
    phone,
    location,
    latitude,
    longitude,
    email,
    password,
    role = 'user',
    userType = 'Trader / Exporter / Importer',
    transportMode,
    cargoCenterName,
    route,
    totalCbm,
    availableCbm,
    pricePerCbm,
    vehicleInfo,
    vehicleNumber,
    serviceDescription,
  } = req.body || {}

  if (!name || !phone || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, phone, email and password are required.' })
  }

  try {
    const isProvider = String(userType || '').toLowerCase().includes('logistics') || role === 'provider'
    if (role === 'admin') {
      return res.status(403).json({ success: false, message: 'Administrator accounts cannot be created through public registration.' })
    }

    const normalizedRole = isProvider ? 'provider' : 'user'
    const userId = generateUserId(isProvider ? 'PRV' : 'USR')
    const totalCapacity = Number(totalCbm)
    const initialAvailable = Number(availableCbm)
    const providerPrice = Number(pricePerCbm)
    const hasProviderCoordinates = latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) && Number(latitude) >= -90 && Number(latitude) <= 90 && Number(longitude) >= -180 && Number(longitude) <= 180
    const validTransportModes = ['Road', 'Rail', 'Ship', 'Air']

    if (isProvider && (!company || !phone || !location || !cargoCenterName || !route || !serviceDescription || !validTransportModes.includes(transportMode))) {
      return res.status(400).json({ success: false, message: 'Provider organisation, contact, location, transport mode, cargo center, route and service description are required.' })
    }

    if (isProvider && (!Number.isFinite(totalCapacity) || totalCapacity <= 0 || !Number.isFinite(initialAvailable) || initialAvailable < 0 || initialAvailable > totalCapacity || !Number.isFinite(providerPrice) || providerPrice <= 0)) {
      return res.status(400).json({ success: false, message: 'Enter a positive total capacity and price, with available CBM between zero and total capacity.' })
    }

    db.prepare(`
      INSERT INTO users (
        user_id, name, alternate_name, company, phone, location, latitude, longitude, email, password,
        role, user_type, transport_mode, cargo_center_name, route, total_cbm,
        available_cbm, price_per_cbm, vehicle_info, vehicle_number, service_description, approval_status, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      name.trim(),
      toOptionalText(alternateName),
      toOptionalText(company),
      toOptionalText(phone),
      toOptionalText(location),
      isProvider && hasProviderCoordinates ? Number(latitude) : null,
      isProvider && hasProviderCoordinates ? Number(longitude) : null,
      email.trim().toLowerCase(),
      password,
      normalizedRole,
      toOptionalText(userType) || (isProvider ? 'Logistics Service Provider (Road / Rail / Ship / Air)' : 'Trader / Exporter / Importer'),
      isProvider ? transportMode : null,
      isProvider ? toOptionalText(cargoCenterName) : null,
      isProvider ? toOptionalText(route) : null,
      isProvider ? totalCapacity : null,
      isProvider ? initialAvailable : null,
      isProvider ? providerPrice : null,
      isProvider ? toOptionalText(vehicleInfo) : null,
      isProvider ? toOptionalText(vehicleNumber) : null,
      isProvider ? toOptionalText(serviceDescription) : null,
      isProvider ? 'Pending Inspection' : 'approved',
      'active'
    )

    const row = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId)
    if (isProvider) io.emit('provider_application_submitted', { userId })

    const successMessage = isProvider
      ? 'Logistics Service Provider application submitted successfully. Your registration is under review and will be inspected by CargoSpace Admin.'
      : 'User registered successfully'

    return res.status(201).json({
      success: true,
      message: successMessage,
      user: row,
    })
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ success: false, message: 'A user with this email already exists.' })
    }

    return res.status(500).json({ success: false, message: 'Registration failed.', error: error.message })
  }
})

// FORGOT PASSWORD FLOW
app.post('/api/forgot-password/request', (req, res) => {
  const { type = 'email', identifier } = req.body || {}
  const cleanIdentifier = String(identifier || '').trim()

  if (!['email', 'phone'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Choose email or phone verification.' })
  }

  if (!cleanIdentifier) {
    return res.status(400).json({
      success: false,
      message: type === 'email' ? 'Please enter your registered email address.' : 'Please enter your registered phone number.',
    })
  }

  let user = null
  if (type === 'email') {
    user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(cleanIdentifier)
  } else {
    const rawPhone = cleanIdentifier.replace(/\D/g, '')
    if (rawPhone.length < 7 || rawPhone.length > 15) {
      return res.status(400).json({ success: false, message: 'Enter a valid registered phone number including its country code when needed.' })
    }
    const users = db.prepare('SELECT * FROM users WHERE phone IS NOT NULL').all()
    user = users.find((candidate) => {
      const savedPhone = candidate.phone?.replace(/\D/g, '') || ''
      return savedPhone === rawPhone || (rawPhone.length >= 10 && savedPhone.endsWith(rawPhone))
    })
  }

  if (!user) {
    return res.status(404).json({
      success: false,
      message: type === 'email'
        ? 'No account found with this email address. Please check your spelling or register a new account.'
        : 'No account found with this phone number. Please check the number or verify using email.',
    })
  }

  // Generate 6-digit OTP and reset token
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const resetToken = generateUserId('RST')
  const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes expiry

  // Clean old pending resets for this user
  db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(user.user_id)

  db.prepare(`
    INSERT INTO password_resets (reset_token, identifier, type, user_id, otp, expires_at, verified)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `).run(resetToken, cleanIdentifier, type, user.user_id, otp, expiresAt)

  // Mask identifier for user display
  const maskedIdentifier = type === 'email'
    ? cleanIdentifier.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => `${a}${'*'.repeat(Math.max(b.length, 3))}${c}`)
    : cleanIdentifier.replace(/\d(?=\d{3})/g, '*')

  return res.json({
    success: true,
    message: `Verification code sent to your registered ${type === 'email' ? 'email address' : 'phone number'}. (DEMO MODE)`,
    demoOtp: otp,
    resetToken,
    expiresAt,
    type,
    maskedIdentifier,
    userFullName: user.name,
  })
})

app.post('/api/forgot-password/verify-otp', (req, res) => {
  const { resetToken, otp } = req.body || {}
  const cleanOtp = String(otp || '').trim()

  if (!resetToken || !cleanOtp) {
    return res.status(400).json({ success: false, message: 'Reset token and 6-digit verification code are required.' })
  }

  const record = db.prepare('SELECT * FROM password_resets WHERE reset_token = ?').get(resetToken)
  if (!record) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification session. Please request a new code.' })
  }

  if (Date.now() > record.expires_at) {
    db.prepare('DELETE FROM password_resets WHERE reset_token = ?').run(resetToken)
    return res.status(400).json({ success: false, message: 'Verification code has expired (valid for 5 minutes). Please request a new code.' })
  }

  if (record.otp !== cleanOtp) {
    return res.status(400).json({ success: false, message: 'Invalid verification code. Please check and try again.' })
  }

  const verifiedToken = generateUserId('VFD')
  db.prepare('UPDATE password_resets SET verified = 1, reset_token = ? WHERE reset_token = ?').run(verifiedToken, resetToken)

  return res.json({
    success: true,
    message: 'Verification code verified successfully. You can now set your new password.',
    verifiedToken,
  })
})

app.post('/api/forgot-password/reset', (req, res) => {
  const { verifiedToken, newPassword, confirmPassword } = req.body || {}
  const cleanNewPassword = String(newPassword || '')
  const cleanConfirmPassword = String(confirmPassword || '')

  if (!verifiedToken) {
    return res.status(400).json({ success: false, message: 'Missing verification token. Please start verification again.' })
  }

  if (!cleanNewPassword || cleanNewPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' })
  }

  if (cleanNewPassword !== cleanConfirmPassword) {
    return res.status(400).json({ success: false, message: 'New password and confirmation password do not match.' })
  }

  const record = db.prepare('SELECT * FROM password_resets WHERE reset_token = ? AND verified = 1').get(verifiedToken)
  if (!record) {
    return res.status(400).json({ success: false, message: 'Invalid or expired session. Please start the password reset process again.' })
  }

  if (Date.now() > record.expires_at + 15 * 60 * 1000) {
    db.prepare('DELETE FROM password_resets WHERE reset_token = ?').run(verifiedToken)
    return res.status(400).json({ success: false, message: 'Password reset session expired. Please request a new verification code.' })
  }

  // Update the user's password
  db.prepare('UPDATE users SET password = ? WHERE user_id = ?').run(cleanNewPassword, record.user_id)

  // Remove the reset session
  db.prepare('DELETE FROM password_resets WHERE reset_token = ?').run(verifiedToken)

  return res.json({
    success: true,
    message: 'Password reset successfully! You can now log in with your new password.',
  })
})

app.post('/api/legacy-user', (req, res) => {
  const { name, email, password } = req.body || {}

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Legacy user name, email and password are required.' })
  }

  try {
    const userId = generateUserId('LEG')
    const insert = db.prepare(`
      INSERT INTO legacy_users (user_id, name, email, password, source)
      VALUES (?, ?, ?, ?, ?)
    `)

    insert.run(userId, name, email, password, 'legacy')

    const user = db.prepare('SELECT * FROM legacy_users WHERE user_id = ?').get(userId)

    return res.status(201).json({
      success: true,
      message: 'Legacy user registered successfully',
      user,
    })
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ success: false, message: 'This legacy user already exists.' })
    }

    return res.status(500).json({ success: false, message: 'Legacy user registration failed.', error: error.message })
  }
})

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' })
  }

  const admin = db.prepare('SELECT * FROM admins WHERE email = ? AND password = ?').get(email, password)
  if (admin) {
    return res.json({ success: true, message: 'Admin login successful', user: admin, role: 'admin' })
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password)
  if (user) {
    return res.json({ success: true, message: 'User login successful', user, role: user.role || 'user' })
  }

  return res.status(401).json({ success: false, message: 'Invalid email or password.' })
})

app.put('/api/account', (req, res) => {
  const identity = requireIdentity(req, res, 'user')
  if (!identity) return
  const { name, alternateName, company, phone, location } = req.body || {}
  const trimmedName = String(name || '').trim()
  if (!trimmedName) return res.status(400).json({ success: false, message: 'Your full name is required.' })
  try {
    db.prepare('UPDATE users SET name = ?, alternate_name = ?, company = ?, phone = ?, location = ? WHERE user_id = ?')
      .run(trimmedName, toOptionalText(alternateName), toOptionalText(company), toOptionalText(phone), toOptionalText(location), identity.id)
    const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(identity.id)
    return res.json({ success: true, message: 'Profile updated successfully.', user })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to update your profile.', error: error.message })
  }
})

app.post('/api/account/change-password', (req, res) => {
  const identity = requireIdentity(req, res, 'user')
  if (!identity) return
  const currentPassword = String(req.body?.currentPassword || '')
  const newPassword = String(req.body?.newPassword || '')
  if (!currentPassword || newPassword.length < 6) return res.status(400).json({ success: false, message: 'Enter your current password and a new password of at least 6 characters.' })
  const user = db.prepare('SELECT password FROM users WHERE user_id = ?').get(identity.id)
  if (!user || user.password !== currentPassword) return res.status(401).json({ success: false, message: 'Your current password is incorrect.' })
  db.prepare('UPDATE users SET password = ? WHERE user_id = ?').run(newPassword, identity.id)
  return res.json({ success: true, message: 'Password changed successfully.' })
})

app.delete('/api/account', (req, res) => {
  const identity = requireIdentity(req, res, 'user')
  if (!identity) return
  const password = String(req.body?.password || '')
  const user = db.prepare('SELECT password FROM users WHERE user_id = ?').get(identity.id)
  if (!user || user.password !== password) return res.status(401).json({ success: false, message: 'Your password is incorrect.' })
  db.transaction(() => {
    db.prepare('DELETE FROM chat_messages WHERE sender_id = ? OR receiver_id = ?').run(identity.id, identity.id)
    db.prepare('UPDATE bookings SET user_id = NULL WHERE user_id = ?').run(identity.id)
    db.prepare('DELETE FROM users WHERE user_id = ?').run(identity.id)
  })()
  return res.json({ success: true, message: 'Your account has been deleted.' })
})

app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all()
  const admins = db.prepare('SELECT * FROM admins ORDER BY created_at DESC').all()
  const legacyUsers = db.prepare('SELECT * FROM legacy_users ORDER BY created_at DESC').all()

  res.json({
    success: true,
    users,
    admins,
    legacyUsers,
    allUsers: [...users, ...admins, ...legacyUsers],
  })
})

app.get('/api/bookings', (req, res) => {
  const identity = requireIdentity(req, res, 'admin')
  if (!identity) return
  const bookings = db.prepare(`
    SELECT b.*, COALESCE(b.customer_name, u.name) AS trader_name,
      COALESCE(u.company, '') AS trader_company,
      COALESCE(b.customer_phone, u.phone) AS trader_phone,
      COALESCE(b.customer_email, u.email) AS trader_email
    FROM bookings b
    LEFT JOIN users u ON u.user_id = b.user_id
    ORDER BY b.created_at DESC
  `).all().map((booking) => {
    const listing = getContainerAvailability(booking.container_id)
    return {
      ...booking,
      provider_name: listing?.provider || 'CargoSpace demo provider',
      provider_contact: listing?.providerContact || '',
      provider_phone: listing?.providerPhone || '',
      provider_email: listing?.providerEmail || '',
      vehicle_number: listing?.vehicleNumber || '',
      cargo_center_name: listing?.cargoCenterName || '',
      location_city: listing?.locationCity || listing?.origin || '',
      provider_booking_count: db.prepare('SELECT COUNT(*) AS count FROM bookings WHERE container_id = ?').get(booking.container_id).count,
    }
  })
  return res.json({ success: true, bookings })
})

app.get('/api/my-bookings', (req, res) => {
  const identity = requireIdentity(req, res, 'user')
  if (!identity) return
  const bookings = db.prepare('SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC').all(identity.id)
  return res.json({ success: true, bookings })
})

const BASE_CONTAINERS = [
  {
    id: 'CS-MUM-2041',
    provider: 'ABC Logistics',
    cargoCenterName: 'ABC Western Logistics Hub',
    origin: 'Mumbai',
    destination: 'Ahmedabad',
    route: 'Mumbai → Ahmedabad',
    mode: 'Road',
    cargoType: 'Textiles',
    totalCbm: 500,
    defaultBooked: 380,
    pricePerCbm: 500,
    departure: '2026-09-06',
    verified: true,
    status: 'Available',
    originCoordinates: [19.076, 72.8777],
    destinationCoordinates: [23.0225, 72.5714],
  },
  {
    id: 'CS-VAP-5101',
    provider: 'Vapi Transit Logistics',
    providerContact: 'Aarav Patel',
    providerPhone: '+91 98765 51001',
    providerEmail: 'vapi@demo-cargospace.in',
    vehicleNumber: 'GJ-15-AB-5101',
    cargoCenterName: 'Vapi Inland Cargo Center',
    nearbyLocation: 'Vapi GIDC Industrial Estate',
    locationCity: 'Vapi',
    locationCoordinates: [20.3893, 72.9106],
    origin: 'Vapi',
    destination: 'Surat',
    route: 'Vapi → Surat',
    mode: 'Road',
    cargoType: 'General Cargo',
    totalCbm: 260,
    defaultBooked: 0,
    pricePerCbm: 440,
    departure: '2026-10-08',
    verified: true,
    status: 'Available',
    originCoordinates: [20.3893, 72.9106],
    destinationCoordinates: [21.1702, 72.8311],
  },
  {
    id: 'CS-SUR-5102',
    provider: 'Surat Multi-Modal Freight',
    providerContact: 'Diya Shah',
    providerPhone: '+91 98765 51002',
    providerEmail: 'surat@demo-cargospace.in',
    vehicleNumber: 'GJ-05-CD-5102',
    cargoCenterName: 'Surat Multi-Modal Cargo Hub',
    nearbyLocation: 'Surat Railway Parcel and Cargo Terminal',
    locationCity: 'Surat',
    locationCoordinates: [21.1702, 72.8311],
    origin: 'Surat',
    destination: 'Vadodara',
    route: 'Surat → Vadodara',
    mode: 'Rail',
    cargoType: 'Textiles',
    totalCbm: 340,
    defaultBooked: 0,
    pricePerCbm: 390,
    departure: '2026-10-09',
    verified: true,
    status: 'Available',
    originCoordinates: [21.1702, 72.8311],
    destinationCoordinates: [22.3072, 73.1812],
  },
  {
    id: 'CS-VAD-5103',
    provider: 'Vadodara Cargo Connect',
    providerContact: 'Kabir Desai',
    providerPhone: '+91 98765 51003',
    providerEmail: 'vadodara@demo-cargospace.in',
    vehicleNumber: 'GJ-06-EF-5103',
    cargoCenterName: 'Vadodara Inland Container Depot',
    nearbyLocation: 'Makarpura GIDC Freight Zone',
    locationCity: 'Vadodara',
    locationCoordinates: [22.3072, 73.1812],
    origin: 'Vadodara',
    destination: 'Ahmedabad',
    route: 'Vadodara → Ahmedabad',
    mode: 'Road',
    cargoType: 'Machinery',
    totalCbm: 300,
    defaultBooked: 0,
    pricePerCbm: 460,
    departure: '2026-10-10',
    verified: true,
    status: 'Available',
    originCoordinates: [22.3072, 73.1812],
    destinationCoordinates: [23.0225, 72.5714],
  },
  {
    id: 'CS-DEL-1188',
    provider: 'NorthRail Freight',
    cargoCenterName: 'Northern Rail Freight Terminal',
    origin: 'Delhi',
    destination: 'Kolkata',
    route: 'Delhi → Kolkata',
    mode: 'Rail',
    cargoType: 'Machinery',
    totalCbm: 600,
    defaultBooked: 420,
    pricePerCbm: 400,
    departure: '2026-09-08',
    verified: true,
    status: 'Available',
    originCoordinates: [28.6139, 77.209],
    destinationCoordinates: [22.5726, 88.3639],
  },
  {
    id: 'CS-MUN-3302',
    provider: 'BlueWave Shipping',
    cargoCenterName: 'Mundra Coastal Maritime Hub',
    origin: 'Mundra',
    destination: 'Chennai',
    route: 'Mundra → Chennai',
    mode: 'Ship',
    cargoType: 'General Cargo',
    totalCbm: 800,
    defaultBooked: 580,
    pricePerCbm: 350,
    departure: '2026-09-11',
    verified: true,
    status: 'Available',
    originCoordinates: [22.8394, 69.7219],
    destinationCoordinates: [13.0827, 80.2707],
  },
  {
    id: 'CS-BLR-0904',
    provider: 'AeroLink Cargo',
    cargoCenterName: 'Bengaluru Airport Cargo Complex',
    origin: 'Bengaluru',
    destination: 'Hyderabad',
    route: 'Bengaluru → Hyderabad',
    mode: 'Air',
    cargoType: 'Electronics',
    totalCbm: 100,
    defaultBooked: 60,
    pricePerCbm: 950,
    departure: '2026-09-05',
    verified: true,
    status: 'Available',
    originCoordinates: [12.9716, 77.5946],
    destinationCoordinates: [17.385, 78.4867],
  },
  {
    id: 'CS-PUN-5510',
    provider: 'Deccan Haulage',
    cargoCenterName: 'Deccan Roadways Logistics Park',
    origin: 'Pune',
    destination: 'Hyderabad',
    route: 'Pune → Hyderabad',
    mode: 'Road',
    cargoType: 'Auto Parts',
    totalCbm: 400,
    defaultBooked: 320,
    pricePerCbm: 480,
    departure: '2026-09-07',
    verified: true,
    status: 'Available',
    originCoordinates: [18.5204, 73.8567],
    destinationCoordinates: [17.385, 78.4867],
  },
  {
    id: 'CS-CHN-7721',
    provider: 'Coastal Connect',
    cargoCenterName: 'Chennai Port Logistics Center',
    origin: 'Chennai',
    destination: 'Kochi',
    route: 'Chennai → Kochi',
    mode: 'Ship',
    cargoType: 'Pharma',
    totalCbm: 500,
    defaultBooked: 350,
    pricePerCbm: 420,
    departure: '2026-09-10',
    verified: true,
    status: 'Available',
    originCoordinates: [13.0827, 80.2707],
    destinationCoordinates: [9.9312, 76.2673],
  },
]

function getAllApprovedContainers() {
  const list = [...BASE_CONTAINERS]
  const cityCoordinates = {
    Mumbai: [19.076, 72.8777], Pune: [18.5204, 73.8567], Ahmedabad: [23.0225, 72.5714],
    Delhi: [28.6139, 77.209], Chennai: [13.0827, 80.2707], Bengaluru: [12.9716, 77.5946],
    Hyderabad: [17.385, 78.4867], Kolkata: [22.5726, 88.3639], Mundra: [22.8394, 69.7219],
    Kochi: [9.9312, 76.2673], Surat: [21.1702, 72.8311], Vapi: [20.3893, 72.9106],
    Vadodara: [22.3072, 73.1812],
  }
  try {
    const approvedProviders = db.prepare(`
      SELECT * FROM users
      WHERE (role = 'provider' OR user_type LIKE '%Logistics%') AND LOWER(approval_status) = 'approved'
    `).all()

    approvedProviders.forEach((p) => {
      const cid = `CS-PRV-${p.user_id.slice(-6)}`
      if (!list.some((item) => item.id === cid)) {
        const origin = p.location || 'Chennai'
        const routeParts = String(p.route || '').split('→').map((s) => s.trim())
        const destination = routeParts[1] || 'Mumbai'
        list.push({
          id: cid,
          provider: p.company || p.name,
          providerContact: p.name,
          providerPhone: p.phone,
          providerEmail: p.email,
          vehicleNumber: p.vehicle_number,
          cargoCenterName: p.cargo_center_name || `${p.company || p.name} Logistics Center`,
          locationCity: origin,
          origin: routeParts[0] || origin,
          destination,
          route: p.route || `${origin} → ${destination}`,
          mode: p.transport_mode || 'Road',
          cargoType: 'General Cargo',
          totalCbm: Number(p.total_cbm) > 0 ? Number(p.total_cbm) : 500,
          defaultBooked: Number(p.total_cbm) > 0 && Number(p.available_cbm) >= 0 ? Math.min(Number(p.total_cbm), Math.max(0, Number(p.total_cbm) - Number(p.available_cbm))) : 0,
          pricePerCbm: Number(p.price_per_cbm) > 0 ? Number(p.price_per_cbm) : 500,
          departure: '2026-09-15',
          verified: true,
          status: 'Available',
          originCoordinates: cityCoordinates[routeParts[0] || origin] || cityCoordinates.Chennai,
          destinationCoordinates: cityCoordinates[destination] || cityCoordinates.Mumbai,
          locationCoordinates: p.latitude != null && p.longitude != null ? [Number(p.latitude), Number(p.longitude)] : null,
        })
      }
    })
  } catch (err) {
    console.error('Error fetching approved providers:', err.message)
  }
  return list
}

function getCapacityTotals(containerId, totalValue, initiallyBookedValue = 0) {
  const bookedRow = db.prepare(`
    SELECT COALESCE(SUM(space), 0) AS booked_cbm, COUNT(*) AS booking_count
    FROM bookings
    WHERE container_id = ? AND status IN ('Confirmed', 'In Transit') AND payment_status = 'PAID'
  `).get(containerId)

  const liveBookedCbm = Number(bookedRow?.booked_cbm || 0)
  const totalCbm = Math.max(0, Number(totalValue) || 0)
  const initiallyBooked = Math.min(totalCbm, Math.max(0, Number(initiallyBookedValue) || 0))
  const bookedCbm = Math.min(totalCbm, initiallyBooked + liveBookedCbm)
  return {
    totalCbm,
    bookedCbm,
    availableCbm: Math.max(0, totalCbm - bookedCbm),
    recentBookedCbm: liveBookedCbm,
    activeBookingsCount: bookedRow?.booking_count || 0,
  }
}

function calculateBookingTotals(space, pricePerCbm) {
  const subtotal = Math.round(space * pricePerCbm)
  const handlingFee = 450
  const serviceFee = Math.round(subtotal * 0.05)
  const taxes = Math.round((subtotal + handlingFee + serviceFee) * 0.18)
  const taxesFees = handlingFee + serviceFee + taxes
  return { subtotal, handlingFee, serviceFee, taxes, taxesFees, total: subtotal + taxesFees }
}

function ensureDemoCenterBookings() {
  const demoBookings = [
    { id: 'BK-DEMO-VAP-001', containerId: 'CS-VAP-5101', space: 90, customer: 'Meera Joshi', phone: '+91 90000 51001', email: 'meera.demo@example.test', date: '2026-10-02', start: '09:00', end: '10:00' },
    { id: 'BK-DEMO-VAP-002', containerId: 'CS-VAP-5101', space: 60, customer: 'Rohan Shah', phone: '+91 90000 51002', email: 'rohan.demo@example.test', date: '2026-10-03', start: '11:00', end: '12:00' },
    { id: 'BK-DEMO-SUR-001', containerId: 'CS-SUR-5102', space: 120, customer: 'Asha Patel', phone: '+91 90000 51003', email: 'asha.demo@example.test', date: '2026-10-03', start: '09:00', end: '10:00' },
    { id: 'BK-DEMO-SUR-002', containerId: 'CS-SUR-5102', space: 85, customer: 'Dev Mehta', phone: '+91 90000 51004', email: 'dev.demo@example.test', date: '2026-10-04', start: '13:00', end: '14:00' },
    { id: 'BK-DEMO-VAD-001', containerId: 'CS-VAD-5103', space: 100, customer: 'Ira Trivedi', phone: '+91 90000 51005', email: 'ira.demo@example.test', date: '2026-10-04', start: '10:00', end: '11:00' },
    { id: 'BK-DEMO-VAD-002', containerId: 'CS-VAD-5103', space: 75, customer: 'Neil Desai', phone: '+91 90000 51006', email: 'neil.demo@example.test', date: '2026-10-05', start: '12:00', end: '13:00' },
  ]
  const findCenter = (containerId) => BASE_CONTAINERS.find((center) => center.id === containerId)
  const insert = db.prepare(`
    INSERT OR IGNORE INTO bookings (
      booking_id, user_id, container_id, route, space, status, payment_status,
      booking_date, slot_start_time, slot_end_time, customer_name, customer_phone,
      customer_email, cargo_center_name, provider_name, vehicle_number, price_per_cbm,
      subtotal, taxes_fees, payment_date, payment_method, amount, receipt_number
    ) VALUES (?, NULL, ?, ?, ?, 'Confirmed', 'PAID', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Demo payment', ?, ?)
  `)
  db.transaction(() => {
    demoBookings.forEach((booking) => {
      if (db.prepare('SELECT 1 FROM bookings WHERE booking_id = ?').get(booking.id)) return
      const center = findCenter(booking.containerId)
      const price = calculateBookingTotals(booking.space, center.pricePerCbm)
      insert.run(
        booking.id,
        center.id,
        center.route,
        booking.space,
        booking.date,
        booking.start,
        booking.end,
        booking.customer,
        booking.phone,
        booking.email,
        center.cargoCenterName,
        center.provider,
        center.vehicleNumber,
        center.pricePerCbm,
        price.subtotal,
        price.taxesFees,
        `${booking.date}T08:00:00.000Z`,
        price.total,
        `CS-${booking.id}`,
      )
    })
  })()
}

ensureDemoCenterBookings()

function ensureSampleProviderBookings() {
  const containerId = `CS-PRV-${sampleProviderId.slice(-6)}`
  const provider = db.prepare('SELECT company, cargo_center_name, route FROM users WHERE user_id = ?').get(sampleProviderId)
  const demoBookings = [
    { id: 'BK-DEMO-PRV-001', space: 18, date: '2026-10-03', start: '09:00', end: '10:00', vehicle: 'TN 09 AB 4821' },
    { id: 'BK-DEMO-PRV-002', space: 12, date: '2026-10-04', start: '11:00', end: '12:00', vehicle: 'TN 22 CD 7640' },
  ]
  const insertBooking = db.prepare(`
    INSERT OR IGNORE INTO bookings (
      booking_id, user_id, container_id, route, space, status, payment_status,
      booking_date, slot_start_time, slot_end_time, customer_name, customer_phone,
      customer_email, cargo_center_name, provider_name, vehicle_number,
      customer_vehicle_number, price_per_cbm, subtotal, taxes_fees, payment_date,
      payment_method, amount, receipt_number
    ) VALUES (?, ?, ?, ?, ?, ?, 'PAID', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Demo payment', ?, ?)
  `)
  const insertMessage = db.prepare(`
    INSERT OR IGNORE INTO chat_messages (
      message_id, booking_id, sender_id, receiver_id, sender_role, message, timestamp, read_status
    ) VALUES (?, ?, ?, ?, 'user', ?, ?, 0)
  `)

  db.transaction(() => {
    demoBookings.forEach((booking, index) => {
      const price = calculateBookingTotals(booking.space, 500)
      insertBooking.run(
        booking.id, sampleUserId, containerId, provider.route, booking.space,
        index === 0 ? 'Confirmed' : 'In Transit', booking.date, booking.start, booking.end,
        'Ananya Mehta', '+91 98765 43210', 'trader@cargospace.com',
        provider.cargo_center_name, provider.company, null, booking.vehicle, 500,
        price.subtotal, price.taxesFees, `${booking.date}T08:00:00.000Z`,
        price.total, `CS-${booking.id}`,
      )
    })
    insertMessage.run(
      'MSG-DEMO-PRV-001', demoBookings[0].id, sampleUserId, sampleProviderId,
      'Hello, can you confirm the pickup window for vehicle TN 09 AB 4821?',
      '2026-10-03T08:30:00.000Z',
    )
  })()
}

ensureSampleProviderBookings()

function getContainerAvailability(containerId) {
  const allContainers = getAllApprovedContainers()
  const meta = allContainers.find((container) => container.id === containerId)
  if (!meta) return null

  const capacity = getCapacityTotals(containerId, meta.totalCbm, meta.defaultBooked)

  return {
    containerId,
    provider: meta.provider,
    providerContact: meta.providerContact,
    providerPhone: meta.providerPhone,
    providerEmail: meta.providerEmail,
    vehicleNumber: meta.vehicleNumber,
    locationCity: meta.locationCity || meta.origin,
    locationCoordinates: meta.locationCoordinates || null,
    originCoordinates: meta.originCoordinates,
    destinationCoordinates: meta.destinationCoordinates,
    cargoCenterName: meta.cargoCenterName,
    origin: meta.origin,
    destination: meta.destination,
    route: meta.route,
    mode: meta.mode,
    cargoType: meta.cargoType,
    pricePerCbm: meta.pricePerCbm,
    ...capacity,
    price: meta.pricePerCbm,
    lastUpdated: new Date().toISOString(),
    status: capacity.availableCbm <= 0 ? 'Fully Booked' : capacity.availableCbm <= 50 ? 'High Demand' : 'Available for Booking',
    verified: meta.verified ?? true,
  }
}

function publicCapacityData(data) {
  if (!data) return null
  const publicData = { ...data }
  delete publicData.providerContact
  delete publicData.providerPhone
  delete publicData.providerEmail
  delete publicData.vehicleNumber
  return publicData
}

app.get('/api/containers/availability', (req, res) => {
  const containerId = req.query.containerId
  if (containerId) {
    const data = getContainerAvailability(containerId)
    if (!data) return res.status(404).json({ success: false, message: 'Cargo space was not found or is not approved for listing.' })
    return res.json({ success: true, data: publicCapacityData(data) })
  }
  const result = {}
  getAllApprovedContainers().forEach((c) => {
    result[c.id] = publicCapacityData(getContainerAvailability(c.id))
  })
  return res.json({ success: true, containers: result })
})

app.get('/api/logistics-centers', (req, res) => {
  const { city } = req.query || {}
  const all = getAllApprovedContainers().map((c) => {
    const avail = getContainerAvailability(c.id)
    return {
      ...publicCapacityData(c),
      totalCbm: avail.totalCbm,
      bookedCbm: avail.bookedCbm,
      availableCbm: avail.availableCbm,
      pricePerCbm: avail.pricePerCbm,
      status: avail.status,
    }
  })

  let filtered = all
  if (city) {
    const term = String(city).trim().toLowerCase()
    filtered = all.filter(
      (c) =>
        c.origin.toLowerCase().includes(term) ||
        c.destination.toLowerCase().includes(term) ||
        String(c.locationCity || '').toLowerCase().includes(term) ||
        String(c.nearbyLocation || '').toLowerCase().includes(term) ||
        c.cargoCenterName.toLowerCase().includes(term) ||
        c.provider.toLowerCase().includes(term)
    )
  }

  return res.json({ success: true, centers: filtered })
})

app.get('/api/admin/logistics-centers', (req, res) => {
  const identity = requireIdentity(req, res, 'admin')
  if (!identity) return
  const centers = getAllApprovedContainers().map((center) => ({
    ...center,
    ...getContainerAvailability(center.id),
  }))
  return res.json({ success: true, centers })
})

// Admin Logistics Providers Management
app.get('/api/admin/providers', (req, res) => {
  const identity = requireIdentity(req, res, 'admin')
  if (!identity) return
  const providers = db.prepare(`
    SELECT user_id, name, alternate_name, company, phone, location, latitude, longitude, email, user_type,
      transport_mode, cargo_center_name, route, total_cbm, available_cbm,
      price_per_cbm, vehicle_info, vehicle_number, service_description, approval_status,
      inspection_notes, created_at
    FROM users
    WHERE role = 'provider' OR user_type LIKE '%Logistics%'
    ORDER BY created_at DESC
  `).all().map((provider) => {
    const containerId = `CS-PRV-${provider.user_id.slice(-6)}`
    const totalCbm = Math.max(0, Number(provider.total_cbm) || 0)
    const registeredBookedCbm = Math.min(totalCbm, Math.max(0, totalCbm - (Number(provider.available_cbm) || 0)))
    const bookings = db.prepare(`
      SELECT b.*, COALESCE(b.customer_name, trader.name) AS trader_name,
        COALESCE(trader.company, '') AS trader_company,
        COALESCE(b.customer_phone, trader.phone) AS trader_phone,
        COALESCE(b.customer_email, trader.email) AS trader_email
      FROM bookings b
      LEFT JOIN users trader ON trader.user_id = b.user_id
      WHERE b.container_id = ?
      ORDER BY b.created_at DESC
    `).all(containerId)
    return { ...provider, ...getCapacityTotals(containerId, totalCbm, registeredBookedCbm), bookingCount: bookings.length, bookings }
  })
  return res.json({ success: true, providers })
})

app.get('/api/provider/profile', (req, res) => {
  const identity = requireIdentity(req, res, 'provider')
  if (!identity) return
  const provider = db.prepare(`
    SELECT user_id, name, alternate_name, company, phone, location, latitude, longitude, email, user_type,
      transport_mode, cargo_center_name, route, total_cbm, available_cbm,
      price_per_cbm, vehicle_info, vehicle_number, service_description, approval_status,
      inspection_notes, created_at
    FROM users WHERE user_id = ?
  `).get(identity.id)
  const containerId = `CS-PRV-${provider.user_id.slice(-6)}`
  const totalCbm = Math.max(0, Number(provider.total_cbm) || 0)
  const registeredBookedCbm = Math.min(totalCbm, Math.max(0, totalCbm - (Number(provider.available_cbm) || 0)))
  const bookings = db.prepare(`
    SELECT b.booking_id, b.user_id, b.container_id, b.route, b.space, b.status, b.payment_status,
      b.booking_date, b.slot_start_time, b.slot_end_time, b.amount, b.subtotal, b.taxes_fees,
      b.payment_date, b.payment_method, b.receipt_number, b.customer_vehicle_number, b.created_at,
      COALESCE(b.customer_name, trader.name) AS customer_name,
      COALESCE(b.customer_phone, trader.phone) AS customer_phone,
      COALESCE(b.customer_email, trader.email) AS customer_email,
      COALESCE(trader.company, '') AS customer_company
    FROM bookings b
    LEFT JOIN users trader ON trader.user_id = b.user_id
    WHERE b.container_id = ?
    ORDER BY b.created_at DESC
  `).all(containerId)
  return res.json({ success: true, provider: { ...provider, ...getCapacityTotals(containerId, totalCbm, registeredBookedCbm), bookings } })
})

app.post('/api/provider/containers', (req, res) => {
  const identity = requireIdentity(req, res, 'provider')
  if (!identity) return
  const totalToAdd = Number(req.body?.totalCbm)
  const availableToAdd = Number(req.body?.availableCbm)
  console.log('Provider containers request:', { userId: identity.id, totalToAdd, availableToAdd })
  if (!Number.isInteger(totalToAdd) || totalToAdd <= 0 || !Number.isInteger(availableToAdd) || availableToAdd < 0 || availableToAdd > totalToAdd) {
    console.log('Validation failed:', { totalToAdd, availableToAdd, isIntTotal: Number.isInteger(totalToAdd), isIntAvail: Number.isInteger(availableToAdd) })
    return res.status(400).json({ success: false, message: 'Enter a positive total CBM and available CBM between zero and the total.' })
  }

  try {
    const result = db.prepare(`
      UPDATE users
      SET total_cbm = COALESCE(total_cbm, 0) + ?, available_cbm = COALESCE(available_cbm, 0) + ?
      WHERE user_id = ? AND role = 'provider'
    `).run(totalToAdd, availableToAdd, identity.id)
    console.log('DB update result:', result)

    const provider = db.prepare('SELECT user_id, total_cbm, available_cbm, approval_status FROM users WHERE user_id = ?').get(identity.id)
    console.log('Provider after update:', provider)
    const containerId = `CS-PRV-${provider.user_id.slice(-6)}`
    const totalCbm = Number(provider.total_cbm) || 0
    const registeredBookedCbm = Math.max(0, totalCbm - (Number(provider.available_cbm) || 0))
    const capacity = getCapacityTotals(containerId, totalCbm, registeredBookedCbm)
    const availability = getContainerAvailability(containerId)
    if (availability) io.emit('space_updated', availability)

    return res.json({ success: true, provider: { ...provider, ...capacity } })
  } catch (error) {
    console.error('Error adding container capacity:', error)
    return res.status(500).json({ success: false, message: 'Unable to add container capacity. Please try again.' })
  }
})

app.post('/api/admin/providers/:userId/status', (req, res) => {
  const identity = requireIdentity(req, res, 'admin')
  if (!identity) return
  const { status, inspectionNotes } = req.body || {}
  const validStatuses = ['Pending Inspection', 'Under Review', 'Approved', 'Rejected']
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid provider status.' })
  }

  const user = db.prepare('SELECT * FROM users WHERE user_id = ? AND role = ?').get(req.params.userId, 'provider')
  if (!user) {
    return res.status(404).json({ success: false, message: 'Logistics service provider not found.' })
  }

  db.prepare(`
    UPDATE users
    SET approval_status = ?, inspection_notes = ?
    WHERE user_id = ?
  `).run(status, toOptionalText(inspectionNotes), req.params.userId)

  const updatedUser = db.prepare('SELECT user_id, approval_status, inspection_notes FROM users WHERE user_id = ?').get(req.params.userId)

  io.emit('provider_status_updated', { userId: updatedUser.user_id, status: updatedUser.approval_status })

  return res.json({
    success: true,
    message: `Provider status updated to ${status}.`,
    provider: updatedUser,
  })
})

app.post('/api/payments/confirm', (req, res) => {
  const identity = requireIdentity(req, res, 'user')
  if (!identity) return
  const { bookingId, containerId, space, bookingDate, slotStartTime, slotEndTime, customerVehicleNumber, receiptNumber, paymentMethod = 'Demo payment' } = req.body || {}
  const customerVehicle = String(customerVehicleNumber || '').trim().toUpperCase()
  const isClockTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''))
  const spaceNum = Number(space)
  const validPaymentMethods = ['UPI', 'Credit/Debit Card', 'Net Banking', 'Demo payment']

  if (customerVehicle.length < 4 || customerVehicle.length > 20) {
    return res.status(400).json({ success: false, message: 'Enter a customer pickup vehicle number between 4 and 20 characters.' })
  }

  if (!bookingId || !containerId || !Number.isInteger(spaceNum) || spaceNum <= 0 || !isClockTime(slotStartTime) || !isClockTime(slotEndTime) || slotEndTime <= slotStartTime || !validPaymentMethods.includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: 'Payment confirmation is missing booking details.' })
  }

  try {
    const result = db.transaction(() => {
      const existing = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(bookingId)
      if (existing && existing.user_id && existing.user_id !== identity.id) {
        return { error: { status: 403, message: 'This booking belongs to another account.' } }
      }
      if (existing && (existing.container_id !== containerId || existing.status === 'Cancelled')) {
        return { error: { status: 409, message: 'This booking cannot be confirmed for the selected cargo space.' } }
      }
      if (existing?.payment_status === 'PAID') {
        return { booking: existing, alreadyConfirmed: true }
      }

      const currentAvailability = getContainerAvailability(containerId)
      if (!currentAvailability) {
        return { error: { status: 404, message: 'Cargo space was not found or is not approved for listing.' } }
      }
      if (spaceNum > currentAvailability.availableCbm) {
        return { error: { status: 400, message: `Only ${currentAvailability.availableCbm} CBM is currently available.` } }
      }

      const pricePerCbm = Number(currentAvailability.pricePerCbm)
      const price = calculateBookingTotals(spaceNum, pricePerCbm)
      const paidAt = new Date().toISOString()
      const route = currentAvailability.route
      const savedBookingDate = bookingDate || new Date().toISOString().slice(0, 10)

      if (existing) {
        db.prepare(`UPDATE bookings SET user_id = ?, route = ?, space = ?, status = 'Confirmed', payment_status = 'PAID', booking_date = ?, slot_start_time = ?, slot_end_time = ?, customer_name = ?, customer_phone = ?, customer_email = ?, cargo_center_name = ?, provider_name = ?, vehicle_number = ?, customer_vehicle_number = ?, price_per_cbm = ?, subtotal = ?, taxes_fees = ?, payment_date = ?, payment_method = ?, amount = ?, receipt_number = ? WHERE booking_id = ?`)
          .run(identity.id, route, spaceNum, savedBookingDate, slotStartTime, slotEndTime, identity.name, identity.phone, identity.email, currentAvailability.cargoCenterName, currentAvailability.provider, currentAvailability.vehicleNumber, customerVehicle, pricePerCbm, price.subtotal, price.taxesFees, paidAt, paymentMethod, price.total, receiptNumber || existing.receipt_number, bookingId)
      } else {
        db.prepare(`INSERT INTO bookings (booking_id, user_id, container_id, route, space, status, payment_status, booking_date, slot_start_time, slot_end_time, customer_name, customer_phone, customer_email, cargo_center_name, provider_name, vehicle_number, customer_vehicle_number, price_per_cbm, subtotal, taxes_fees, payment_date, payment_method, amount, receipt_number) VALUES (?, ?, ?, ?, ?, 'Confirmed', 'PAID', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(bookingId, identity.id, containerId, route, spaceNum, savedBookingDate, slotStartTime, slotEndTime, identity.name, identity.phone, identity.email, currentAvailability.cargoCenterName, currentAvailability.provider, currentAvailability.vehicleNumber, customerVehicle, pricePerCbm, price.subtotal, price.taxesFees, paidAt, paymentMethod, price.total, receiptNumber || `CS-${bookingId}`)
      }
      return { booking: db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(bookingId) }
    })()

    if (result.error) return res.status(result.error.status).json({ success: false, message: result.error.message })
    const booking = result.booking
    if (!result.alreadyConfirmed) io.emit('booking_created', booking)
    io.emit('space_updated', getContainerAvailability(containerId))
    return res.json({ success: true, booking, price: { subtotal: booking.subtotal, taxesFees: booking.taxes_fees, total: booking.amount, pricePerCbm: booking.price_per_cbm } })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to confirm payment.', error: error.message })
  }
})

app.post('/api/bookings/:bookingId/cancel', (req, res) => {
  const identity = requireIdentity(req, res, 'user')
  if (!identity) return
  const reason = String(req.body?.reason || '').trim()
  if (!reason) return res.status(400).json({ success: false, message: 'A cancellation reason is required.' })
  const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ? AND user_id = ?').get(req.params.bookingId, identity.id)
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found for this account.' })
  if (booking.status === 'Cancelled') return res.status(409).json({ success: false, message: 'This booking is already cancelled.' })
  const cancelledAt = new Date().toISOString()
  db.prepare("UPDATE bookings SET status = 'Cancelled', cancellation_reason = ?, cancelled_at = ?, refund_status = ? WHERE booking_id = ? AND user_id = ?").run(reason, cancelledAt, booking.payment_status === 'PAID' ? 'PENDING' : 'NOT_APPLICABLE', booking.booking_id, identity.id)
  const updatedBooking = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(booking.booking_id)
  io.emit('booking_cancelled', updatedBooking)
  io.emit('space_updated', getContainerAvailability(booking.container_id))
  return res.json({ success: true, booking: updatedBooking })
})

app.post('/api/admin/bookings/:bookingId/refund', (req, res) => {
  const identity = requireIdentity(req, res, 'admin')
  if (!identity) return
  const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(req.params.bookingId)
  if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' })
  if (booking.status !== 'Cancelled' || booking.payment_status !== 'PAID') return res.status(409).json({ success: false, message: 'Only cancelled, paid bookings can be refunded.' })
  if (booking.refund_status === 'REFUNDED') return res.status(409).json({ success: false, message: 'This booking has already been refunded.' })
  const refundedAt = new Date().toISOString()
  db.prepare("UPDATE bookings SET refund_status = 'REFUNDED', refund_amount = ?, refunded_at = ? WHERE booking_id = ?").run(booking.amount, refundedAt, booking.booking_id)
  const updatedBooking = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(booking.booking_id)
  io.emit('booking_refunded', updatedBooking)
  io.emit('space_updated', getContainerAvailability(booking.container_id))
  return res.json({ success: true, booking: updatedBooking, message: 'Refund recorded successfully.' })
})

app.get('/api/chat/bookings', (req, res) => {
  const identity = requireIdentity(req, res)
  if (!identity) return
  if (identity.role === 'admin') {
    const bookings = db.prepare(`SELECT b.*, u.name AS user_name, u.email AS user_email, (SELECT COUNT(*) FROM chat_messages m WHERE m.booking_id = b.booking_id AND m.receiver_id = b.user_id AND m.read_status = 0) AS unread_count FROM bookings b LEFT JOIN users u ON u.user_id = b.user_id WHERE b.payment_status = 'PAID' AND b.status IN ('Confirmed', 'In Transit') ORDER BY b.created_at DESC`).all()
    return res.json({ success: true, bookings })
  }
  if (identity.role === 'provider') {
    const containerId = `CS-PRV-${identity.id.slice(-6)}`
    const bookings = db.prepare(`
      SELECT b.*, COALESCE(b.customer_name, u.name) AS user_name,
        COALESCE(b.customer_email, u.email) AS user_email,
        (SELECT COUNT(*) FROM chat_messages m WHERE m.booking_id = b.booking_id AND m.receiver_id = ? AND m.read_status = 0) AS unread_count
      FROM bookings b
      LEFT JOIN users u ON u.user_id = b.user_id
      WHERE b.container_id = ? AND b.payment_status = 'PAID' AND b.status IN ('Confirmed', 'In Transit')
      ORDER BY b.created_at DESC
    `).all(identity.id, containerId)
    return res.json({ success: true, bookings })
  }
  const bookings = db.prepare(`SELECT b.*, (SELECT COUNT(*) FROM chat_messages m WHERE m.booking_id = b.booking_id AND m.receiver_id = ? AND m.read_status = 0) AS unread_count FROM bookings b WHERE b.user_id = ? AND b.payment_status = 'PAID' AND b.status IN ('Confirmed', 'In Transit') ORDER BY b.created_at DESC`).all(identity.id, identity.id)
  return res.json({ success: true, bookings })
})

app.get('/api/chat/:bookingId/messages', (req, res) => {
  const identity = requireIdentity(req, res)
  if (!identity) return
  const booking = getPaidBooking(req.params.bookingId, identity)
  if (!booking) return res.status(403).json({ success: false, message: 'Chat is available only for your successful payments.' })
  const messages = db.prepare('SELECT * FROM chat_messages WHERE booking_id = ? ORDER BY timestamp ASC, id ASC').all(booking.booking_id).map(serializeMessage)
  db.prepare('UPDATE chat_messages SET read_status = 1 WHERE booking_id = ? AND receiver_id = ?').run(booking.booking_id, identity.id)
  return res.json({ success: true, messages })
})

app.post('/api/chat/:bookingId/read', (req, res) => {
  const identity = requireIdentity(req, res)
  if (!identity) return
  const booking = getPaidBooking(req.params.bookingId, identity)
  if (!booking) return res.status(403).json({ success: false, message: 'Chat is not available for this booking.' })
  db.prepare('UPDATE chat_messages SET read_status = 1 WHERE booking_id = ? AND receiver_id = ?').run(booking.booking_id, identity.id)
  return res.json({ success: true })
})

app.post('/api/chat/:bookingId/messages', (req, res) => {
  const identity = requireIdentity(req, res)
  if (!identity) return
  const booking = getPaidBooking(req.params.bookingId, identity)
  const cleanMessage = String(req.body?.message || '').trim()
  if (!booking) return res.status(403).json({ success: false, message: 'This booking is not eligible for chat.' })
  if (!cleanMessage) return res.status(400).json({ success: false, message: 'Message cannot be empty.' })
  if (cleanMessage.length > 2000) return res.status(400).json({ success: false, message: 'Message is too long.' })
  if (/\b(card number|cvv|cvc|otp|password)\b/i.test(cleanMessage)) return res.status(400).json({ success: false, message: 'Payment credentials cannot be sent in chat.' })

  const receiverId = identity.role === 'admin' || identity.role === 'provider'
    ? booking.user_id
    : getProviderIdForBooking(booking) || db.prepare("SELECT admin_id FROM admins WHERE status = 'active' ORDER BY id LIMIT 1").get()?.admin_id
  if (!receiverId) return res.status(503).json({ success: false, message: 'Admin support is currently unavailable.' })
  const record = { message_id: generateUserId('MSG'), booking_id: booking.booking_id, sender_id: identity.id, receiver_id: receiverId, sender_role: identity.role, message: cleanMessage, timestamp: new Date().toISOString(), read_status: 0 }
  try {
    db.prepare('INSERT INTO chat_messages (message_id, booking_id, sender_id, receiver_id, sender_role, message, timestamp, read_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(record.message_id, record.booking_id, record.sender_id, record.receiver_id, record.sender_role, record.message, record.timestamp, record.read_status)
    io.to(`booking:${booking.booking_id}`).emit('new_message', serializeMessage(record))
    return res.status(201).json({ success: true, message: serializeMessage(record), queued: true })
  } catch {
    return res.status(500).json({ success: false, message: 'Message could not be saved.' })
  }
})

io.use((socket, next) => {
  const identity = socket.handshake.auth?.userId
    ? db.prepare('SELECT user_id AS id, name, email, role FROM users WHERE user_id = ? AND status = ?').get(socket.handshake.auth.userId, 'active')
    : socket.handshake.auth?.adminId
      ? db.prepare('SELECT admin_id AS id, name, email, role FROM admins WHERE admin_id = ? AND status = ?').get(socket.handshake.auth.adminId, 'active')
      : null
  if (!identity) return next(new Error('Unauthorized'))
  socket.identity = identity
  next()
})

io.on('connection', (socket) => {
  socket.on('join_booking', (bookingId, acknowledge) => {
    const booking = getPaidBooking(bookingId, socket.identity)
    if (!booking) return acknowledge?.({ success: false, message: 'This booking is not eligible for chat.' })
    socket.join(`booking:${bookingId}`)
    acknowledge?.({ success: true })
  })

  socket.on('send_message', ({ bookingId, message }, acknowledge) => {
    const booking = getPaidBooking(bookingId, socket.identity)
    const cleanMessage = String(message || '').trim()
    if (!booking) return acknowledge?.({ success: false, message: 'This booking is not eligible for chat.' })
    if (!cleanMessage) return acknowledge?.({ success: false, message: 'Message cannot be empty.' })
    if (cleanMessage.length > 2000) return acknowledge?.({ success: false, message: 'Message is too long.' })
    if (/\b(card number|cvv|cvc|otp|password)\b/i.test(cleanMessage)) return acknowledge?.({ success: false, message: 'Payment credentials cannot be sent in chat.' })
    const receiverId = socket.identity.role === 'admin' || socket.identity.role === 'provider'
      ? booking.user_id
      : getProviderIdForBooking(booking) || db.prepare("SELECT admin_id FROM admins WHERE status = 'active' ORDER BY id LIMIT 1").get()?.admin_id
    if (!receiverId) return acknowledge?.({ success: false, message: 'Admin support is currently unavailable.' })
    const record = { message_id: generateUserId('MSG'), booking_id: bookingId, sender_id: socket.identity.id, receiver_id: receiverId, sender_role: socket.identity.role, message: cleanMessage, timestamp: new Date().toISOString(), read_status: 0 }
    try {
      db.prepare('INSERT INTO chat_messages (message_id, booking_id, sender_id, receiver_id, sender_role, message, timestamp, read_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(record.message_id, record.booking_id, record.sender_id, record.receiver_id, record.sender_role, record.message, record.timestamp, record.read_status)
      io.to(`booking:${bookingId}`).emit('new_message', serializeMessage(record))
      acknowledge?.({ success: true, message: serializeMessage(record) })
    } catch {
      acknowledge?.({ success: false, message: 'Message could not be saved.' })
    }
  })
})

app.get('/api/admin/:adminId', (req, res) => {
  const admin = db.prepare('SELECT * FROM admins WHERE admin_id = ?').get(req.params.adminId)

  if (!admin) {
    return res.status(404).json({
      success: false,
      message: 'Admin not found. Sample admin ID: ADM-SAMPLE-001',
    })
  }

  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all()
  const adminsList = db.prepare('SELECT * FROM admins ORDER BY created_at DESC').all()
  const legacyUsers = db.prepare('SELECT * FROM legacy_users ORDER BY created_at DESC').all()

  return res.json({
    success: true,
    admin,
    users,
    admins: adminsList,
    legacyUsers,
    allUsers: [...users, ...adminsList, ...legacyUsers],
  })
})

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'CargoSpace API',
    uptimeSeconds: Math.round(process.uptime()),
    appUrl: `http://localhost:${appPort}`,
  })
})

// This port only serves JSON. Anyone who opens it directly gets pointed at the
// Vite dev server instead of an unhelpful "Cannot GET /".
app.get('/', (req, res) => {
  const appUrl = `http://localhost:${appPort}`
  if (!req.accepts('html')) {
    return res.json({ success: true, service: 'CargoSpace API', appUrl, message: `The CargoSpace app runs on ${appUrl}` })
  }
  return res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=${appUrl}" />
    <title>CargoSpace API</title>
    <style>
      body { font-family: system-ui, sans-serif; background: #0b1220; color: #e2e8f0; display: grid; place-items: center; height: 100vh; margin: 0; }
      main { text-align: center; max-width: 36rem; padding: 2rem; }
      a { color: #38bdf8; font-weight: 700; }
      code { background: #1e293b; padding: 2px 6px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <main>
      <h1>CargoSpace API is running</h1>
      <p>Port <code>${port}</code> only serves the API &mdash; the app itself runs on</p>
      <p><a href="${appUrl}">${appUrl}</a></p>
      <p>Redirecting you now. If nothing happens, click the link above.</p>
    </main>
  </body>
</html>`)
})

// Global error handler: ensure all errors return JSON so front-end never sees HTML
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  if (res.headersSent) return next(err)
  res.status(500).json({ success: false, message: 'Internal server error. Please try again.' })
})

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use - the CargoSpace API is most likely already running on http://localhost:${port}.`)
    process.exit(0)
  }
  throw err
})

httpServer.listen(port, () => {
  console.log(`CargoSpace API  ->  http://localhost:${port}`)
  console.log(`CargoSpace app  ->  http://localhost:${appPort}`)
})
