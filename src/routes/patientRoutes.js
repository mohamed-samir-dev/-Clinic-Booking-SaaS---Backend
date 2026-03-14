const express = require('express');
const patientController = require('../controllers/patientController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/profile', patientController.getPatientProfile);
router.put('/profile', patientController.updatePatientProfile);
router.put('/medical-info', patientController.updateMedicalInfo);
router.put('/change-password', patientController.changePassword);
router.delete('/account', patientController.deleteAccount);

// Appointments
router.get('/appointments', patientController.getPatientAppointments);
router.put('/appointments/:id/cancel', patientController.cancelAppointment);
router.put('/appointments/:id/reschedule', patientController.rescheduleAppointment);
router.post('/appointments/:id/review', patientController.addReview);

// Favorites
router.post('/favorites/:doctorId', patientController.addFavoriteDoctor);
router.delete('/favorites/:doctorId', patientController.removeFavoriteDoctor);
router.get('/favorites', patientController.getFavoriteDoctors);

// Favorite Clinics
router.post('/favorites/clinics/:clinicId', patientController.addFavoriteClinic);
router.delete('/favorites/clinics/:clinicId', patientController.removeFavoriteClinic);
router.get('/favorites/clinics', patientController.getFavoriteClinics);

module.exports = router;
