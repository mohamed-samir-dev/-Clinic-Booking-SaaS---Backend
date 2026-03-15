require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const connectDB = require('./src/config/database');

const app = express();

// ===== الاتصال بقاعدة البيانات =====
connectDB();

// ===== CORS =====
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ===== Security Middleware =====
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ===== Rate Limiting =====
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // 100 طلب كحد أقصى
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ===== Body Parser =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== Logging =====
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ===== Home =====
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Clinic Booking API is running 🚀' });
});

// ===== Health Check =====
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// ===== Routes =====
const authRoutes = require('./src/routes/authRoutes');
const ownerRoutes = require('./src/routes/ownerRoutes');
const managerRoutes = require('./src/routes/managerRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const doctorRoutes = require('./src/routes/doctorRoutes');
const clinicRoutes = require('./src/routes/clinicRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const contactRoutes = require('./src/routes/contactRoutes');
const patientRoutes = require('./src/routes/patientRoutes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/patients', patientRoutes);

// ===== 404 Handler =====
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ===== Global Error Handler =====
app.use((err, req, res, next) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ===== Start Server =====
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// ===== Handle Unhandled Rejections =====
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});
