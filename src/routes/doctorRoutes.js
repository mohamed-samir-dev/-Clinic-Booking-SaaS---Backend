const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const transferRequestController = require('../controllers/transferRequestController');
const { authenticateDoctor } = require('../middleware/authMiddleware');

router.get('/profile', authenticateDoctor, doctorController.getDoctorProfile);
router.put('/profile', authenticateDoctor, doctorController.updateDoctorProfile);

// Transfer Requests
router.get('/transfer-requests', authenticateDoctor, transferRequestController.getDoctorRequests);
router.patch('/transfer-requests/:requestId/respond', authenticateDoctor, transferRequestController.respondToTransferRequest);
router.post('/transfer-requests/message', authenticateDoctor, transferRequestController.sendMessageToManager);

router.get('/top', doctorController.getTopDoctors);
router.get('/all', doctorController.getAllDoctorsWithFilters);
router.get('/filters', doctorController.getFilterOptions);
router.get('/:id/availability', doctorController.getDoctorAvailability);
router.get('/:id', doctorController.getDoctorByIdPublic);

module.exports = router;
