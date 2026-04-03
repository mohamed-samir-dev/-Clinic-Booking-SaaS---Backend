const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema(
  {
    // Discriminator: 'main' or 'branch'
    type: {
      type: String,
      enum: ['main', 'branch'],
      required: true,
      default: 'branch',
      index: true,
    },

    // For branches: reference to parent main clinic
    parentClinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      index: true,
      validate: {
        validator: function(v) {
          return this.type === 'branch' ? !!v : true;
        },
        message: 'Branch must have a parent clinic'
      }
    },

    // For branches: single manager per branch
    branchManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manager',
    },

    name: {
      en: {
        type: String,
        required: [true, 'Clinic name in English is required'],
        trim: true,
      },
      ar: {
        type: String,
        required: [true, 'Clinic name in Arabic is required'],
        trim: true,
      },
    },

    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      index: true,
    },

    brief: {
      en: {
        type: String,
        trim: true,
        maxlength: [200, 'Brief cannot exceed 200 characters'],
      },
      ar: {
        type: String,
        trim: true,
        maxlength: [200, 'Brief cannot exceed 200 characters'],
      },
    },

    description: {
      en: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters'],
      },
      ar: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters'],
      },
    },

    // Enhanced address for branches
    address: {
      en: {
        type: String,
        trim: true,
      },
      ar: {
        type: String,
        trim: true,
      },
      country: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      street: {
        type: String,
        trim: true,
      },
      lat: {
        type: Number,
      },
      lng: {
        type: Number,
      },
    },

    phone: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    // Main clinic specific fields
    brandColor: {
      type: String,
      trim: true,
    },

    website: {
      type: String,
      trim: true,
    },

    timezone: {
      type: String,
      default: 'Asia/Riyadh',
    },

    currency: {
      type: String,
      default: 'SAR',
    },

    // Global defaults for main clinic (inherited by branches)
    settings: {
      defaultAppointmentDuration: {
        type: Number,
        default: 30,
        enum: [15, 30, 45, 60],
      },
      defaultWorkingHours: {
        type: Map,
        of: {
          isOpen: Boolean,
          start: String,
          end: String,
        },
      },
      cancellationPolicyHours: {
        type: Number,
        default: 24,
      },
      reschedulePolicyHours: {
        type: Number,
        default: 12,
      },
      bookingRules: {
        minNoticeHours: {
          type: Number,
          default: 2,
        },
        maxAppointmentsPerDay: {
          type: Number,
        },
        allowWalkIns: {
          type: Boolean,
          default: true,
        },
      },
    },

    // Financial settings (main clinic only)
    financial: {
      commissionPercentage: {
        type: Number,
        default: 15,
        min: 0,
        max: 100,
      },
      platformFee: {
        type: Number,
        default: 0,
        min: 0,
      },
      taxEnabled: {
        type: Boolean,
        default: false,
      },
      taxPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      invoicePrefix: {
        type: String,
        trim: true,
        default: 'CS',
      },
    },

    logo: {
      type: String,
      trim: true,
    },

    images: [{
      type: String,
      trim: true,
    }],

    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },

    workingHours: {
      type: Map,
      of: {
        isOpen: Boolean,
        openTime: String,
        closeTime: String,
      },
    },

    facilities: [{
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
      icon: {
        type: String,
        trim: true,
      },
    }],

    capacity: {
      rooms: {
        type: Number,
        min: [0, 'Rooms cannot be negative'],
        default: 0,
      },
      doctors: {
        type: Number,
        min: [0, 'Doctors cannot be negative'],
        default: 0,
      },
      patientsPerDay: {
        type: Number,
        min: [0, 'Patients per day cannot be negative'],
        default: 0,
      },
    },

    bookingSettings: {
      allowOnlineBooking: {
        type: Boolean,
        default: true,
      },
      advanceBookingDays: {
        type: Number,
        default: 30,
        min: [1, 'Advance booking days must be at least 1'],
      },
      requiresConfirmation: {
        type: Boolean,
        default: false,
      },
      cancellationPolicy: {
        en: {
          type: String,
          trim: true,
        },
        ar: {
          type: String,
          trim: true,
        },
      },
    },

    ratingAvg: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    monthlyRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },

    socialMedia: {
      facebook: {
        type: String,
        trim: true,
      },
      instagram: {
        type: String,
        trim: true,
      },
      twitter: {
        type: String,
        trim: true,
      },
      website: {
        type: String,
        trim: true,
      },
    },

    status: {
      type: String,
      enum: ['active', 'suspended', 'inactive'],
      default: 'active',
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Owner',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
clinicSchema.index({ type: 1, businessId: 1 });
clinicSchema.index({ parentClinicId: 1, status: 1 });
clinicSchema.index({ branchManagerId: 1 });
clinicSchema.index({ type: 1, status: 1 });
clinicSchema.index({ businessId: 1, 'name.en': 1 });
clinicSchema.index({ businessId: 1, isActive: 1 });
clinicSchema.index({ 'address.lat': 1, 'address.lng': 1 });

// Virtual for branches count (main clinic)
clinicSchema.virtual('branchesCount', {
  ref: 'Clinic',
  localField: '_id',
  foreignField: 'parentClinicId',
  count: true,
});

// Methods
clinicSchema.methods.isMainClinic = function() {
  return this.type === 'main';
};

clinicSchema.methods.isBranch = function() {
  return this.type === 'branch';
};

clinicSchema.methods.getEffectiveWorkingHours = async function() {
  if (this.workingHours && Object.keys(this.workingHours).length > 0) {
    return this.workingHours;
  }
  
  if (this.type === 'branch' && this.parentClinicId) {
    const parent = await this.model('Clinic').findById(this.parentClinicId);
    return parent?.settings?.defaultWorkingHours || {};
  }
  
  return this.settings?.defaultWorkingHours || {};
};

const Clinic = mongoose.model('Clinic', clinicSchema);

module.exports = Clinic;
