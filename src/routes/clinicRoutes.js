const express = require('express');
const router = express.Router();
const Clinic = require('../models/Clinic');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const clinics = await Clinic.find({})
      .select('name logo address phone isActive')
      .sort({ createdAt: -1 });
    
    console.log('Fetched clinics:', clinics.length);
    res.json(clinics);
  } catch (error) {
    console.error('Error fetching clinics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const clinic = await Clinic.findById(req.params.id);
    
    if (!clinic) {
      return res.status(404).json({ message: 'Clinic not found' });
    }
    
    // Convert Map to plain object
    const clinicObj = clinic.toObject();
    if (clinicObj.workingHours instanceof Map) {
      clinicObj.workingHours = Object.fromEntries(clinicObj.workingHours);
    }
    
    res.json(clinicObj);
  } catch (error) {
    console.error('Error fetching clinic:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:id/reviews', async (req, res) => {
  try {
    const Review = require('../models/Review');
    const reviews = await Review.find({ clinicId: req.params.id })
      .populate('patientId', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    
    const clinic = await Clinic.findById(req.params.id);
    
    res.json({
      reviews,
      averageRating: clinic?.ratingAvg || 0,
      totalReviews: clinic?.ratingCount || 0
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/:id/reviews', protect, restrictTo('patient'), async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    if (!comment || comment.trim().length < 10) {
      return res.status(400).json({ message: 'Comment must be at least 10 characters' });
    }

    const Review = require('../models/Review');
    
    const existingReview = await Review.findOne({
      clinicId: req.params.id,
      patientId: req.user.id
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this clinic' });
    }

    const review = new Review({
      clinicId: req.params.id,
      patientId: req.user.id,
      rating,
      comment: comment.trim()
    });

    await review.save();

    const allReviews = await Review.find({ clinicId: req.params.id });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await Clinic.findByIdAndUpdate(req.params.id, {
      ratingAvg: avgRating,
      ratingCount: allReviews.length
    });

    res.status(201).json({ message: 'Review submitted successfully', review });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
