const express = require('express');
const authController = require('../controllers/authController');
const patientAuthController = require('../controllers/patientAuthController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get All Businesses (for login dropdown)
router.get('/businesses', authController.getAllBusinesses);

// Get Business ID by Email
router.post('/get-business', authController.getBusinessByEmail);

// Owner Register
router.post('/owner/register', authController.ownerRegister);

// Owner Login
router.post('/owner/login', authController.ownerLogin);

// Manager Login
router.post('/manager/login', authController.managerLogin);

// Doctor Login
router.post('/doctor/login', authController.doctorLogin);

// Staff Login
router.post('/staff/login', authController.staffLogin);

// Get Current User
router.get('/me', authenticate, authController.getMe);

// Patient Login
router.post('/patient/login', patientAuthController.patientLogin);

// Patient Register
router.post('/patient/register', patientAuthController.patientRegister);

// Patient Google Auth (Login)
router.post('/patient/google', patientAuthController.patientGoogleAuth);

// Patient Google Auth (Register)
router.post('/patient/google-register', patientAuthController.patientGoogleRegister);

module.exports = router;
