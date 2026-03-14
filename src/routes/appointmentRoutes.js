const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const patientMedicalController = require('../controllers/patientMedicalController');
const { authenticate, optionalAuth } = require('../middleware/auth');

router.post('/', optionalAuth, appointmentController.createAppointment);
router.get('/check-daily', optionalAuth, appointmentController.checkDailyAppointment);
router.get('/blocked-dates', optionalAuth, appointmentController.getBlockedDates);
router.get('/booked-slots', appointmentController.getBookedSlots);
router.get('/doctor-stats', authenticate, appointmentController.getDoctorStats);
router.get('/doctor/today', authenticate, appointmentController.getTodayAppointments);
router.get('/doctor/pending', authenticate, appointmentController.getPendingRequests);
router.get('/doctor/range', authenticate, appointmentController.getDoctorAppointmentsByRange);
router.patch('/:id/status', authenticate, appointmentController.updateAppointmentStatus);
router.get('/:id', optionalAuth, appointmentController.getAppointmentById);
router.post('/link-guest', authenticate, appointmentController.linkGuestAppointments);
router.get('/patient-medical/:patientId', authenticate, patientMedicalController.getPatientMedicalInfo);

module.exports = router;
