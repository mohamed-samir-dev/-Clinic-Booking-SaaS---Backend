const mongoose = require('mongoose');

const blockedSlotSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    enum: ['Surgery', 'Doctor Break', 'Meeting', 'Emergency', 'Training', 'Personal Leave', 'Other'],
    default: 'Meeting'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Manager'
  }
}, {
  timestamps: true
});

blockedSlotSchema.index({ doctorId: 1, date: 1 });

module.exports = mongoose.model('BlockedSlot', blockedSlotSchema);
