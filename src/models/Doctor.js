const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const doctorSchema = new mongoose.Schema(
  {
    // 1) الحقول الأساسية
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: [true, 'Clinic ID is required'],
      index: true,
    },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },

    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },

    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },

    name: {
      en: {
        type: String,
        trim: true,
      },
      ar: {
        type: String,
        trim: true,
      },
    },

    specialty: {
      en: {
        type: String,
        required: [true, 'Specialty (English) is required'],
        trim: true,
      },
      ar: {
        type: String,
        trim: true,
      },
    },

    title: {
      type: String,
      enum: ['Dr', 'Prof', 'Consultant'],
      default: 'Dr',
    },

    photoUrl: {
      type: String,
      trim: true,
    },

    bio: {
      en: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters'],
        trim: true,
      },
      ar: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters'],
        trim: true,
      },
    },

    brief: {
      en: {
        type: String,
        maxlength: [200, 'Brief cannot exceed 200 characters'],
        trim: true,
      },
      ar: {
        type: String,
        maxlength: [200, 'Brief cannot exceed 200 characters'],
        trim: true,
      },
    },

    aboutUs: {
      en: {
        type: String,
        maxlength: [2000, 'About Us cannot exceed 2000 characters'],
        trim: true,
      },
      ar: {
        type: String,
        maxlength: [2000, 'About Us cannot exceed 2000 characters'],
        trim: true,
      },
    },

    experienceYears: {
      type: Number,
      min: [0, 'Experience years cannot be negative'],
      default: 0,
    },

    languages: [{
      type: String,
      trim: true,
    }],

    education: [{
      degree: {
        type: String,
        trim: true,
      },
      institution: {
        type: String,
        trim: true,
      },
      year: {
        type: String,
        trim: true,
      },
    }],

    specializations: [{
      en: {
        type: String,
        trim: true,
      },
      ar: {
        type: String,
        trim: true,
      },
    }],

    gender: {
      type: String,
      enum: ['male', 'female'],
    },

    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      trim: true,
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },

    // 2) التواصل والمكان
    phone: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },

    clinicBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClinicBranch',
    },

    location: {
      address: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      mapsLink: {
        type: String,
        trim: true,
      },
    },

    // 3) الحجز والعيادة
    fees: {
      type: Number,
      required: [true, 'Consultation fee is required'],
      min: [0, 'Fee cannot be negative'],
    },

    followUpFees: {
      type: Number,
      min: [0, 'Follow-up fee cannot be negative'],
    },

    consultationDuration: {
      type: Number,
      default: 20,
      enum: [15, 20, 30, 45, 60],
    },

    availability: [{
      day: {
        type: String,
        enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        required: true,
      },
      slots: [{
        from: {
          type: String,
          required: true,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'],
        },
        to: {
          type: String,
          required: true,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'],
        },
      }],
      workingHours: {
        from: {
          type: String,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'],
        },
        to: {
          type: String,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'],
        },
      },
    }],

    bookingSettings: {
      maxAppointmentsPerDay: {
        type: Number,
        default: 20,
      },
      allowOnlineBooking: {
        type: Boolean,
        default: true,
      },
      requiresConfirmation: {
        type: Boolean,
        default: false,
      },
    },

    // 4) التقييمات والظهور
    ratingAvg: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    ratingCount: {
      type: Number,
      default: 0,
    },

    monthlyRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },

    tags: [{
      type: String,
      trim: true,
    }],

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isAvailableToday: {
      type: Boolean,
      default: false,
    },

    // 5) المراجعات
    reviews: [{
      patientName: {
        type: String,
        trim: true,
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: {
        type: String,
        trim: true,
        maxlength: 500,
      },
      date: {
        type: Date,
        default: Date.now,
      },
      isVerified: {
        type: Boolean,
        default: false,
      },
    }],

    // بيانات الدخول للدكتور
    auth: {
      passwordHash: {
        type: String,
        select: false,
      },
      emailVerified: {
        type: Boolean,
        default: false,
      },
      lastLoginAt: {
        type: Date,
      },
      passwordChangedAt: {
        type: Date,
      },
      failedLoginAttempts: {
        type: Number,
        default: 0,
      },
      lockUntil: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

doctorSchema.index({ clinicId: 1, email: 1 }, { unique: true });
doctorSchema.index({ clinicId: 1, status: 1 });
doctorSchema.index({ specialty: 1 });
doctorSchema.index({ isFeatured: 1, status: 1 });
doctorSchema.index({ ratingAvg: -1 });

doctorSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

doctorSchema.virtual('isAvailable').get(function () {
  if (this.status !== 'active') return false;
  
  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  
  const todaySchedule = this.availability?.find(a => a.day === currentDay);
  if (!todaySchedule || !todaySchedule.slots?.length) return false;
  
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return todaySchedule.slots.some(slot => currentTime >= slot.from && currentTime <= slot.to);
});

doctorSchema.virtual('isLocked').get(function () {
  return !!(this.auth?.lockUntil && this.auth.lockUntil > Date.now());
});

doctorSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.auth?.passwordHash) return false;
  return await bcrypt.compare(candidatePassword, this.auth.passwordHash);
};

doctorSchema.methods.incrementLoginAttempts = async function () {
  if (this.auth?.lockUntil && this.auth.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { 'auth.failedLoginAttempts': 1 },
      $unset: { 'auth.lockUntil': 1 },
    });
  }

  const updates = { $inc: { 'auth.failedLoginAttempts': 1 } };
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCK_TIME = 30 * 60 * 1000;

  if ((this.auth?.failedLoginAttempts || 0) + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    updates.$set = { 'auth.lockUntil': Date.now() + LOCK_TIME };
  }

  return await this.updateOne(updates);
};

doctorSchema.methods.resetLoginAttempts = async function () {
  return await this.updateOne({
    $set: { 'auth.failedLoginAttempts': 0, 'auth.lastLoginAt': Date.now() },
    $unset: { 'auth.lockUntil': 1 },
  });
};

doctorSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.auth?.passwordChangedAt) {
    const changedTimestamp = parseInt(this.auth.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

doctorSchema.statics.findByClinicAndEmail = function (clinicId, email) {
  return this.findOne({ clinicId, email: email.toLowerCase() }).select('+auth.passwordHash');
};

doctorSchema.statics.findByClinicAndSpecialty = function (clinicId, specialty) {
  return this.find({ 
    clinicId, 
    specialty,
    status: 'active' 
  });
};

doctorSchema.pre('save', async function () {
  if (!this.isModified('auth.passwordHash')) return;

  if (this.auth?.passwordHash) {
    const salt = await bcrypt.genSalt(12);
    this.auth.passwordHash = await bcrypt.hash(this.auth.passwordHash, salt);

    if (!this.isNew) {
      this.auth.passwordChangedAt = Date.now() - 1000;
    }
  }
});

doctorSchema.pre('save', function () {
  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const todaySchedule = this.availability?.find(a => a.day === currentDay);
  this.isAvailableToday = !!(todaySchedule && todaySchedule.slots?.length > 0);
  
  if (this.reviews && this.reviews.length > 0) {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.ratingAvg = Math.round((totalRating / this.reviews.length) * 10) / 10;
    this.ratingCount = this.reviews.length;
  }
});

doctorSchema.pre('findOneAndUpdate', async function () {
  const update = this.getUpdate();
  
  // تشفير كلمة المرور إذا تم تحديثها
  if (update['auth.passwordHash']) {
    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt(12);
    update['auth.passwordHash'] = await bcrypt.hash(update['auth.passwordHash'], salt);
    update['auth.passwordChangedAt'] = Date.now() - 1000;
  }
  
  if (update.availability || update.$set?.availability) {
    const availability = update.availability || update.$set?.availability;
    const now = new Date();
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const todaySchedule = availability?.find(a => a.day === currentDay);
    const isAvailableToday = !!(todaySchedule && todaySchedule.slots?.length > 0);
    
    if (update.$set) {
      update.$set.isAvailableToday = isAvailableToday;
    } else {
      update.isAvailableToday = isAvailableToday;
    }
  }
});

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;
