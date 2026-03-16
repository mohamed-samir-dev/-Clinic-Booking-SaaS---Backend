const Doctor = require('../models/Doctor');
const Review = require('../models/Review');

exports.createReview = async (req, res) => {
  try {
    const { doctorId, rating, comment, patientName } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({
        status: 'error',
        message: 'Rating and comment are required',
      });
    }

    if (comment.trim().length < 10) {
      return res.status(400).json({
        status: 'error',
        message: 'Comment must be at least 10 characters',
      });
    }

    // إذا كان هناك doctorId، نضيف الريفيو للدكتور
    if (doctorId) {
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({
          status: 'error',
          message: 'Doctor not found',
        });
      }

      const newReview = {
        patientName: patientName || 'Anonymous',
        rating,
        comment,
        date: new Date(),
        isVerified: false,
      };

      doctor.reviews.push(newReview);
      await doctor.save();

      return res.status(201).json({
        status: 'success',
        message: 'Review submitted successfully. It will be visible after admin approval.',
        data: newReview,
      });
    }

    // إذا لم يكن هناك doctorId، نضيف ريفيو عام
    const newReview = await Review.create({
      patientName: patientName || 'Anonymous',
      rating,
      comment,
      isVerified: true,
    });

    res.status(201).json({
      status: 'success',
      message: 'Review submitted successfully',
      data: newReview,
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.getDoctorReviews = async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        status: 'error',
        message: 'Doctor not found',
      });
    }

    res.status(200).json({
      status: 'success',
      results: doctor.reviews.length,
      data: doctor.reviews,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ isActive: true, isVerified: true, doctorId: null })
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      status: 'success',
      results: reviews.length,
      data: reviews,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.getReviewStats = async (req, res) => {
  try {
    const reviews = await Review.find({ isActive: true, isVerified: true, doctorId: null });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

    const ratingDistribution = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length,
    };

    res.status(200).json({
      status: 'success',
      data: {
        totalReviews,
        averageRating,
        ratingDistribution,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};
