const mongoose = require('mongoose');

const transferRequestSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true,
    },

    fromClinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
    },

    toClinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
    },

    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manager',
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },

    doctorResponse: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    managerResponse: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    respondedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

transferRequestSchema.index({ doctorId: 1, status: 1 });
transferRequestSchema.index({ managerId: 1, status: 1 });

const TransferRequest = mongoose.model('TransferRequest', transferRequestSchema);

module.exports = TransferRequest;
