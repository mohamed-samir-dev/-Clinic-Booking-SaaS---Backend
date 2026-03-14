const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      index: true,
    },

    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      index: true,
    },

    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      index: true,
    },

    patientName: {
      type: String,
      trim: true,
    },

    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },

    comment: {
      type: String,
      required: [true, 'Comment is required'],
      trim: true,
      minlength: [10, 'Comment must be at least 10 characters'],
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ patientId: 1, doctorId: 1 }, { sparse: true });
reviewSchema.index({ patientId: 1, clinicId: 1 }, { sparse: true });
reviewSchema.index({ doctorId: 1, isActive: 1 });
reviewSchema.index({ clinicId: 1, isActive: 1 });
reviewSchema.index({ rating: 1 });

reviewSchema.statics.calcAverageRatings = async function (doctorId) {
  const stats = await this.aggregate([
    {
      $match: { doctorId: doctorId, isActive: true }
    },
    {
      $group: {
        _id: '$doctorId',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  if (stats.length > 0) {
    await mongoose.model('Doctor').findByIdAndUpdate(doctorId, {
      reviewsCount: stats[0].nRating,
      ratingAverage: Math.round(stats[0].avgRating * 10) / 10
    });
  } else {
    await mongoose.model('Doctor').findByIdAndUpdate(doctorId, {
      reviewsCount: 0,
      ratingAverage: 0
    });
  }
};

reviewSchema.post('save', function () {
  if (this.doctorId) {
    this.constructor.calcAverageRatings(this.doctorId);
  }
});

reviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc && doc.doctorId) {
    await doc.constructor.calcAverageRatings(doc.doctorId);
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
