const express = require('express');
const router = express.Router();
const { authenticate, restrictTo } = require('../middleware/auth');

// Import controller
const managerController = require('../controllers/managerController');
const transferRequestController = require('../controllers/transferRequestController');

// Protect all routes - only managers can access
router.use(authenticate);
router.use(restrictTo('manager'));

// Manager Profile
router.get('/profile', managerController.getProfile);

// Dashboard
router.get('/dashboard', managerController.getDashboard);

// Appointments
router.get('/appointments', managerController.getAppointments);
router.post('/appointments', managerController.createAppointment);
router.patch('/appointments/:id/confirm', managerController.confirmAppointment);
router.patch('/appointments/:id/cancel', managerController.cancelAppointment);
router.patch('/appointments/:id/reschedule', managerController.rescheduleAppointment);
router.patch('/appointments/:id/no-show', managerController.markNoShow);

// Doctors
router.get('/doctors', managerController.getDoctors);
router.get('/doctors/specialties', managerController.getSpecialties);
router.get('/doctors/available', managerController.getAvailableDoctors);
router.post('/doctors', managerController.createDoctor);
router.post('/doctors/assign', managerController.assignDoctor);
router.patch('/doctors/:id/deactivate', managerController.deactivateDoctor);
router.patch('/doctors/:id/schedule', managerController.updateDoctorSchedule);
router.get('/doctors/:id/available-dates', managerController.getDoctorAvailableDates);
router.get('/doctors/:id/available-times', managerController.getDoctorAvailableTimes);
router.patch('/doctors/:id/toggle-status', managerController.toggleDoctorStatus);

// Patients
router.get('/patients', managerController.getPatients);

// Reviews
router.get('/reviews', managerController.getReviews);
router.delete('/reviews/:reviewId', managerController.deleteReview);

// Schedules
router.get('/schedules', managerController.getSchedules);
router.patch('/schedules/:id', managerController.updateSchedule);

// Blocked Slots
router.get('/blocked-slots', managerController.getBlockedSlots);
router.post('/blocked-slots', managerController.createBlockedSlot);
router.delete('/blocked-slots/:id', managerController.deleteBlockedSlot);

// Schedule Stats
router.get('/schedule-stats', managerController.getScheduleStats);

// Clinic Settings
router.get('/clinic', managerController.getClinic);
router.put('/clinic', managerController.updateClinic);

// Transfer Requests
router.post('/transfer-requests', transferRequestController.sendTransferRequest);
router.get('/transfer-requests', transferRequestController.getManagerRequests);
router.post('/transfer-requests/reply', transferRequestController.replyToDoctor);

module.exports = router;
