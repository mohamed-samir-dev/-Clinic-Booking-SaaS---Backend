const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

router.post('/', reviewController.createReview);
router.get('/', reviewController.getAllReviews);
router.get('/stats', reviewController.getReviewStats);
router.get('/doctor/:doctorId', reviewController.getDoctorReviews);

module.exports = router;
