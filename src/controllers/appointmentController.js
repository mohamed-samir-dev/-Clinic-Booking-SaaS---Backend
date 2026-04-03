const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const BlockedSlot = require('../models/BlockedSlot');
const { v4: uuidv4 } = require('uuid');

exports.createAppointment = async (req, res) => {
  try {
    const {
      doctorId,
      appointmentDate,
      startTime,
      endTime,
      patientData,
      reason,
      service,
      type = 'consultation',
      guestId
    } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    let patientId = null;
    let finalGuestId = guestId;

    if (req.user && req.user.role === 'patient') {
      patientId = req.user.id;
    } else {
      if (!finalGuestId) {
        finalGuestId = uuidv4();
      }
    }

    // التحقق من عدم وجود حجز مع نفس الدكتور في نفس اليوم
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingQuery = {
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['cancelled'] }
    };

    if (patientId) {
      existingQuery.patientId = patientId;
    } else if (finalGuestId) {
      existingQuery.guestId = finalGuestId;
    }

    const existingAppointment = await Appointment.findOne(existingQuery);
    if (existingAppointment) {
      return res.status(400).json({ 
        message: 'You already have an appointment with this doctor on this day',
        messageEn: 'You already have an appointment with this doctor on this day'
      });
    }

    if (patientId) {
      const updateData = {
        phone: patientData.phone
      };
      
      // Only update dateOfBirth and gender if they don't exist yet
      const existingPatient = await Patient.findById(patientId).select('dateOfBirth gender');
      
      if (patientData.dateOfBirth && !existingPatient.dateOfBirth) {
        updateData.dateOfBirth = patientData.dateOfBirth;
      }
      
      if (patientData.gender && !existingPatient.gender) {
        updateData.gender = patientData.gender.toLowerCase();
      }
      
      await Patient.findByIdAndUpdate(patientId, { $set: updateData }, { new: true });
    }

    const appointmentPayload = {
      patientId,
      doctorId,
      appointmentDate,
      startTime,
      endTime,
      reason,
      service,
      type,
      fee: doctor.fees,
      status: 'pending'
    };

    if (!patientId) {
      appointmentPayload.guestId = finalGuestId;
      appointmentPayload.guestData = patientData;
    }

    const appointment = await Appointment.create(appointmentPayload);

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('doctorId', 'name specialty fees photoUrl')
      .populate('patientId', 'name email phone');

    res.status(201).json({
      success: true,
      appointment: populatedAppointment,
      guestId: finalGuestId
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ message: 'Error creating appointment', error: error.message });
  }
};

exports.getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { guestId } = req.query;

    const appointment = await Appointment.findById(id)
      .populate('doctorId', 'name specialty fees photoUrl')
      .populate('patientId', 'name email phone');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Verify access
    if (appointment.patientId && req.user && req.user.id === appointment.patientId._id.toString()) {
      return res.json({ success: true, appointment });
    }

    if (appointment.guestId && guestId === appointment.guestId) {
      return res.json({ success: true, appointment });
    }

    return res.status(403).json({ message: 'Unauthorized access' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching appointment', error: error.message });
  }
};

exports.linkGuestAppointments = async (req, res) => {
  try {
    const { guestId, email, phone } = req.body;
    const patientId = req.user.id;

    const appointments = await Appointment.find({ guestId, patientId: null });

    const result = await Appointment.updateMany(
      {
        guestId,
        patientId: null
      },
      {
        $set: { patientId },
        $unset: { guestId: '', guestData: '' }
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} appointments linked to your account`,
      linkedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Link error:', error);
    res.status(500).json({ message: 'Error linking appointments', error: error.message });
  }
};

exports.checkDailyAppointment = async (req, res) => {
  try {
    const { date, doctorId, guestId } = req.query;
    
    if (!date || !doctorId) {
      return res.status(400).json({ message: 'Date and doctorId are required' });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['cancelled'] }
    };

    if (req.user && req.user.role === 'patient') {
      query.patientId = req.user.id;
    } else if (guestId) {
      query.guestId = guestId;
    } else {
      return res.json({ hasAppointment: false });
    }

    const existingAppointment = await Appointment.findOne(query);
    
    res.json({ 
      hasAppointment: !!existingAppointment,
      appointment: existingAppointment ? {
        id: existingAppointment._id,
        date: existingAppointment.appointmentDate,
        time: existingAppointment.startTime
      } : null
    });
  } catch (error) {
    console.error('Check daily appointment error:', error);
    res.status(500).json({ message: 'Error checking appointment', error: error.message });
  }
};

exports.getBlockedDates = async (req, res) => {
  try {
    const { doctorId, guestId } = req.query;

    if (!doctorId) {
      return res.status(400).json({ message: 'Doctor ID is required' });
    }

    const query = {
      doctorId,
      status: { $nin: ['cancelled'] }
    };

    if (req.user && req.user.role === 'patient') {
      query.patientId = req.user.id;
    } else if (guestId) {
      query.guestId = guestId;
    } else {
      return res.json({ blockedDates: [] });
    }

    const appointments = await Appointment.find(query).select('appointmentDate');
    
    const blockedDates = appointments.map(apt => {
      const date = new Date(apt.appointmentDate);
      return date.toISOString().split('T')[0];
    });

    res.json({ blockedDates });
  } catch (error) {
    console.error('Get blocked dates error:', error);
    res.status(500).json({ message: 'Error fetching blocked dates', error: error.message });
  }
};

exports.getBookedSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    
    if (!doctorId || !date) {
      return res.status(400).json({ message: 'Doctor ID and date are required' });
    }

    const [year, month, day] = date.split('-').map(Number);
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    // Get booked appointments
    const appointments = await Appointment.find({
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['cancelled'] }
    }).select('_id startTime endTime');

    // Get blocked slots
    const blockedSlots = await BlockedSlot.find({
      doctorId,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).select('startTime endTime reason');

    const bookedSlots = appointments.map(apt => ({
      appointmentId: apt._id.toString(),
      startTime: apt.startTime,
      endTime: apt.endTime,
      type: 'appointment'
    }));

    // Add blocked slots to the response
    const blockedTimes = blockedSlots.map(slot => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      type: 'blocked',
      reason: slot.reason
    }));

    res.json({ 
      bookedSlots: [...bookedSlots, ...blockedTimes]
    });
  } catch (error) {
    console.error('Get booked slots error:', error);
    res.status(500).json({ message: 'Error fetching booked slots', error: error.message });
  }
};

exports.getDoctorStats = async (req, res) => {
  try {
    const doctorId = req.user._id || req.user.id;
    const mongoose = require('mongoose');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const [todayAppointments, pendingRequests, doctorData, totalAppointments] = await Promise.all([
      Appointment.countDocuments({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        appointmentDate: { $gte: today, $lte: endOfDay },
        status: { $nin: ['cancelled'] }
      }),
      Appointment.countDocuments({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        status: 'pending'
      }),
      Doctor.findById(doctorId).select('ratingAvg monthlyRevenue'),
      Appointment.countDocuments({
        doctorId: new mongoose.Types.ObjectId(doctorId),
        status: { $nin: ['cancelled'] }
      })
    ]);

    res.json({
      todayAppointments,
      pendingRequests,
      monthlyRevenue: doctorData?.monthlyRevenue || 0,
      averageRating: doctorData?.ratingAvg ? doctorData.ratingAvg.toFixed(1) : '0.0',
      totalAppointments
    });
  } catch (error) {
    console.error('Get doctor stats error:', error);
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
};

exports.getTodayAppointments = async (req, res) => {
  try {
    const doctorId = req.user._id || req.user.id;
    const mongoose = require('mongoose');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      appointmentDate: { $gte: today, $lte: endOfDay },
      status: { $nin: ['cancelled'] }
    })
    .populate('patientId', 'name')
    .sort({ startTime: 1 })
    .lean();

    const formattedAppointments = appointments.map(apt => ({
      id: apt._id,
      patientName: apt.patientId?.name || apt.guestData?.fullName || 'Guest',
      bookingType: apt.type,
      time: apt.startTime,
      status: apt.status
    }));

    const liveCount = appointments.filter(apt => apt.status === 'confirmed').length;

    res.json({
      appointments: formattedAppointments,
      liveCount
    });
  } catch (error) {
    console.error('Get today appointments error:', error);
    res.status(500).json({ message: 'Error fetching appointments', error: error.message });
  }
};

exports.getDoctorAppointmentsByRange = async (req, res) => {
  try {
    const doctorId = req.user._id || req.user.id;
    const mongoose = require('mongoose');
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      appointmentDate: { $gte: startDate, $lte: endDate }
    })
    .populate('patientId', 'name phone _id')
    .sort({ appointmentDate: 1, startTime: 1 })
    .lean();

    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Get appointments by range error:', error);
    res.status(500).json({ message: 'Error fetching appointments', error: error.message });
  }
};

exports.getPendingRequests = async (req, res) => {
  try {
    const doctorId = req.user._id || req.user.id;
    const mongoose = require('mongoose');

    const appointments = await Appointment.find({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      status: 'pending'
    })
    .populate('patientId', 'name')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

    const formattedAppointments = appointments.map(apt => {
      const createdAt = new Date(apt.createdAt);
      const now = new Date();
      const diffMs = now - createdAt;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      let requestedAgo;
      if (diffDays > 0) {
        requestedAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      } else if (diffHours > 0) {
        requestedAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      } else {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        requestedAgo = `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      }

      return {
        id: apt._id,
        patientName: apt.patientId?.name || apt.guestData?.fullName || 'Guest',
        bookingType: apt.type,
        time: apt.startTime,
        status: apt.status,
        createdAt: apt.createdAt,
        requestedAgo
      };
    });

    res.json({
      success: true,
      requests: formattedAppointments
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ message: 'Error fetching pending requests', error: error.message });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const doctorId = req.user._id || req.user.id;
    const mongoose = require('mongoose');

    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const appointment = await Appointment.findOne({
      _id: id,
      doctorId: new mongoose.Types.ObjectId(doctorId)
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.status = status;
    
    if (status === 'confirmed') {
      const doctor = await Doctor.findById(doctorId);
      if (doctor && doctor.fees) {
        const calculatedFee = doctor.fees * 0.85;
        const careSyncFee = doctor.fees * 0.10;
        const clinicFee = doctor.fees * 0.05;
        appointment.fee = calculatedFee;
        appointment.careSyncFee = careSyncFee;
        appointment.clinicFee = clinicFee;
        appointment.paid = true;
        
        // تحديث monthlyRevenue للدكتور
        doctor.monthlyRevenue = (doctor.monthlyRevenue || 0) + calculatedFee;
        await doctor.save();
        
        // تحديث monthlyRevenue للعيادة
        const Clinic = require('../models/Clinic');
        const clinic = await Clinic.findById(doctor.clinicId);
        if (clinic) {
          clinic.monthlyRevenue = (clinic.monthlyRevenue || 0) + clinicFee;
          await clinic.save();
        }
      }
    }
    
    await appointment.save();

    const updatedAppointment = await Appointment.findById(id)
      .populate('patientId', 'name phone email _id')
      .lean();

    res.json({
      success: true,
      message: `Appointment ${status} successfully`,
      appointment: updatedAppointment
    });
  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({ message: 'Error updating appointment', error: error.message });
  }
};
