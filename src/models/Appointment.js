const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      index: true,
    },

    guestId: {
      type: String,
      index: true,
    },

    guestData: {
      fullName: String,
      email: String,
      phone: String,
      dateOfBirth: Date,
      gender: String,
    },

    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: [true, 'Doctor ID is required'],
      index: true,
    },

    appointmentDate: {
      type: Date,
      required: [true, 'Appointment date is required'],
      index: true,
    },

    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'],
    },

    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'],
    },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show'],
      default: 'pending',
      index: true,
    },

    type: {
      type: String,
      enum: ['consultation', 'follow-up', 'emergency', 'checkup'],
      default: 'consultation',
    },

    service: {
      type: String,
      maxlength: [200, 'Service name cannot exceed 200 characters'],
    },

    reason: {
      type: String,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },

    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },

    fee: {
      type: Number,
      min: [0, 'Fee cannot be negative'],
    },

    paid: {
      type: Boolean,
      default: false,
    },

    careSyncFee: {
      type: Number,
      min: [0, 'CareSync fee cannot be negative'],
      default: 0,
    },

    clinicFee: {
      type: Number,
      min: [0, 'Clinic fee cannot be negative'],
      default: 0,
    },

    cancelledBy: {
      type: String,
      enum: ['patient', 'doctor', 'manager', 'system'],
    },

    cancelledAt: {
      type: Date,
    },

    cancellationReason: {
      type: String,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

appointmentSchema.index({ doctorId: 1, patientId: 1, appointmentDate: 1, status: 1 });
appointmentSchema.index({ doctorId: 1, guestId: 1, appointmentDate: 1, status: 1 });

appointmentSchema.statics.findByDoctor = function (doctorId, date) {
  const query = { doctorId };
  if (date) {
    query.appointmentDate = new Date(date);
  }
  return this.find(query).populate('patientId', 'name email phone _id').sort({ startTime: 1 });
};

appointmentSchema.statics.findByPatient = function (patientId) {
  return this.find({ patientId })
    .populate('doctorId', 'name specialization')
    .populate('businessId', 'name')
    .sort({ appointmentDate: -1 });
};

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
