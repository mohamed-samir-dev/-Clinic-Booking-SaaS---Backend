const Manager = require('../models/Manager');
const Clinic = require('../models/Clinic');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Review = require('../models/Review');
const BlockedSlot = require('../models/BlockedSlot');

// Get Manager Profile
exports.getProfile = async (req, res) => {
  try {
    const manager = await Manager.findById(req.user.id).populate('clinicId', 'name');
    
    res.json({
      name: manager.name,
      profileImage: manager.profileImage || null,
      clinicName: manager.clinicId?.name || 'N/A'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// Get Dashboard Data
exports.getDashboard = async (req, res) => {
  try {
    const manager = await Manager.findById(req.user.id);
    const clinic = await Clinic.findById(manager.clinicId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get all doctors in this clinic
    const clinicDoctors = await Doctor.find({ clinicId: manager.clinicId }).select('_id');
    const doctorIds = clinicDoctors.map(doc => doc._id);

    // Today's appointments
    const todayAppointments = await Appointment.countDocuments({
      doctorId: { $in: doctorIds },
      appointmentDate: { $gte: today, $lt: tomorrow }
    });

    // Yesterday's appointments
    const yesterdayAppointments = await Appointment.countDocuments({
      doctorId: { $in: doctorIds },
      appointmentDate: { $gte: yesterday, $lt: today }
    });

    // Today's pending requests
    const pendingRequests = await Appointment.countDocuments({
      doctorId: { $in: doctorIds },
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: 'pending'
    });

    // Yesterday's pending requests
    const yesterdayPendingRequests = await Appointment.countDocuments({
      doctorId: { $in: doctorIds },
      appointmentDate: { $gte: yesterday, $lt: today },
      status: 'pending'
    });

    // Total doctors
    const totalDoctors = await Doctor.countDocuments({
      clinicId: manager.clinicId,
      status: 'active'
    });

    // Yesterday's total doctors
    const yesterdayDoctors = await Doctor.countDocuments({
      clinicId: manager.clinicId,
      status: 'active',
      createdAt: { $lt: today }
    });

    // Monthly Revenue from clinic
    const todayRevenue = clinic?.monthlyRevenue || 0;

    // Calculate percentage changes
    const appointmentsChange = yesterdayAppointments > 0 
      ? ((todayAppointments - yesterdayAppointments) / yesterdayAppointments * 100).toFixed(1)
      : 0;

    const requestsChange = yesterdayPendingRequests > 0
      ? ((pendingRequests - yesterdayPendingRequests) / yesterdayPendingRequests * 100).toFixed(1)
      : 0;

    const doctorsChange = yesterdayDoctors > 0
      ? ((totalDoctors - yesterdayDoctors) / yesterdayDoctors * 100).toFixed(1)
      : 0;

    // Weekly data
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    const weeklyData = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(weekStart);
      dayStart.setDate(weekStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayAppointments = await Appointment.find({
        doctorId: { $in: doctorIds },
        appointmentDate: { $gte: dayStart, $lt: dayEnd },
        status: { $in: ['confirmed', 'completed'] }
      });

      const dayRevenue = dayAppointments.reduce((sum, apt) => {
        return sum + (apt.clinicFee || 0);
      }, 0);

      weeklyData.push({
        day: days[i],
        appointments: dayAppointments.length,
        revenue: dayRevenue
      });
    }

    res.json({
      stats: {
        todayAppointments,
        pendingRequests,
        totalDoctors,
        todayRevenue,
        appointmentsChange: parseFloat(appointmentsChange),
        requestsChange: parseFloat(requestsChange),
        doctorsChange: parseFloat(doctorsChange),
        revenueChange: 0
      },
      weeklyAppointments: weeklyData,
      weeklyRevenue: weeklyData
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
};

// Get Appointments
exports.getAppointments = async (req, res) => {
  try {
    const manager = await Manager.findById(req.user.id);
    const { filter = 'all', doctorId, status, dateFrom, dateTo, page = 1, limit = 10 } = req.query;
    
    // Get all doctors in this clinic
    const clinicDoctors = await Doctor.find({ clinicId: manager.clinicId }).select('_id');
    const doctorIds = clinicDoctors.map(doc => doc._id);
    
    let dateFilter = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Basic filter (today, tomorrow, week)
    if (filter === 'today') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateFilter = { appointmentDate: { $gte: today, $lt: tomorrow } };
    } else if (filter === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);
      dateFilter = { appointmentDate: { $gte: tomorrow, $lt: dayAfter } };
    } else if (filter === 'week') {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      dateFilter = { appointmentDate: { $gte: today, $lt: weekEnd } };
    }

    // Advanced filters
    const advancedFilters = {};
    
    // Filter by specific doctor
    if (doctorId && doctorId !== '') {
      advancedFilters.doctorId = doctorId;
    } else {
      advancedFilters.doctorId = { $in: doctorIds };
    }
    
    // Filter by status
    if (status && status !== '') {
      advancedFilters.status = status;
    }
    
    // Filter by date range
    if (dateFrom || dateTo) {
      const dateRangeFilter = {};
      if (dateFrom) {
        dateRangeFilter.$gte = new Date(dateFrom + 'T00:00:00.000Z');
      }
      if (dateTo) {
        dateRangeFilter.$lte = new Date(dateTo + 'T23:59:59.999Z');
      }
      dateFilter = { appointmentDate: dateRangeFilter };
    }

    // Combine all filters
    const queryFilters = {
      ...advancedFilters,
      ...dateFilter
    };

    // Get total count for pagination
    const total = await Appointment.countDocuments(queryFilters);

    // Get appointments with pagination
    const appointments = await Appointment.find(queryFilters)
      .populate('patientId', 'name phone email')
      .populate('doctorId', 'name specialty')
      .sort({ appointmentDate: 1, startTime: 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const formattedAppointments = appointments.map(apt => ({
      _id: apt._id,
      patientName: apt.patientId?.name || apt.guestData?.fullName || 'Unknown',
      doctorName: apt.doctorId?.name || 'Unknown',
      date: apt.appointmentDate,
      time: apt.startTime,
      status: apt.status,
      patientId: apt.patientId,
      doctorId: apt.doctorId,
      guestData: apt.guestData,
      reason: apt.reason,
      createdAt: apt.createdAt
    }));

    res.json({
      appointments: formattedAppointments,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: 'Error fetching appointments' });
  }
};

// Create Appointment
exports.createAppointment = async (req, res) => {
  try {
    const manager = await Manager.findById(req.user.id);
    const { doctorId, appointmentDate, startTime, endTime, reason, service, patientData } = req.body;

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    if (doctor.clinicId.toString() !== manager.clinicId.toString()) {
      return res.status(403).json({ message: 'Doctor not in your clinic' });
    }

    const clinic = await Clinic.findById(manager.clinicId);
    if (!clinic || !clinic.businessId) {
      return res.status(400).json({ message: 'Business ID not found for this clinic' });
    }

    const appointmentPayload = {
      businessId: clinic.businessId,
      patientId: null,
      doctorId,
      appointmentDate,
      startTime,
      endTime,
      reason,
      service: service || reason,
      type: 'consultation',
      fee: doctor.fees,
      status: 'pending',
      guestData: patientData
    };

    const appointment = await Appointment.create(appointmentPayload);

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('doctorId', 'name specialty fees photoUrl')
      .populate('patientId', 'name email phone');

    res.status(201).json({
      success: true,
      appointment: populatedAppointment
    });
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ message: 'Error creating appointment', error: error.message });
  }
};

// Confirm Appointment
exports.confirmAppointment = async (req, res) => {
  try {
    await Appointment.findByIdAndUpdate(req.params.id, { status: 'confirmed' });
    res.json({ message: 'Appointment confirmed' });
  } catch (error) {
    res.status(500).json({ message: 'Error confirming appointment' });
  }
};

// Cancel Appointment
exports.cancelAppointment = async (req, res) => {
  try {
    await Appointment.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
    res.json({ message: 'Appointment cancelled' });
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling appointment' });
  }
};

// Reschedule Appointment
exports.rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentDate, startTime } = req.body;
    const appointment = await Appointment.findById(req.params.id).populate('doctorId');
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const duration = appointment.doctorId.consultationDuration || 20;
    const [startHour, startMin] = startTime.split(':').map(Number);
    const endMinutes = startHour * 60 + startMin + duration;
    const endHour = Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

    appointment.appointmentDate = appointmentDate;
    appointment.startTime = startTime;
    appointment.endTime = endTime;
    await appointment.save();

    res.json({ message: 'Appointment rescheduled successfully', appointment });
  } catch (error) {
    console.error('Reschedule error:', error);
    res.status(500).json({ message: 'Error rescheduling appointment' });
  }
};

// Mark as No-show
exports.markNoShow = async (req, res) => {
  try {
    await Appointment.findByIdAndUpdate(req.params.id, { status: 'no-show' });
    res.json({ message: 'Appointment marked as no-show' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating appointment' });
  }
};

// Get Doctors
exports.getDoctors = async (req, res) => {
  try {
    const manager = await Manager.findById(req.user.id);
    const { specialty, availability, experience } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Build query filters
    const query = { clinicId: manager.clinicId };
    
    // Filter by specialty
    if (specialty && specialty !== '') {
      query.$or = [
        { 'specialty.en': specialty },
        { 'specialty.ar': specialty },
        { specialty: specialty }
      ];
    }
    
    // Filter by experience
    if (experience && experience !== '') {
      if (experience === '0-5') {
        query.experienceYears = { $gte: 0, $lte: 5 };
      } else if (experience === '5-10') {
        query.experienceYears = { $gt: 5, $lte: 10 };
      } else if (experience === '10+') {
        query.experienceYears = { $gt: 10 };
      }
    }
    
    const doctors = await Doctor.find(query);
    const doctorIds = doctors.map(d => d._id);

    // Get today's appointments count per doctor
    const todayAppointments = await Appointment.aggregate([
      {
        $match: {
          doctorId: { $in: doctorIds },
          appointmentDate: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: '$doctorId',
          count: { $sum: 1 }
        }
      }
    ]);

    const appointmentMap = {};
    todayAppointments.forEach(apt => {
      appointmentMap[apt._id.toString()] = apt.count;
    });

    // Calculate stats
    const now = new Date();
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    
    const stats = {
      total: doctors.length,
      availableToday: doctors.filter(d => {
        const todaySchedule = d.availability?.find(a => a.day === currentDay);
        return d.status === 'active' && todaySchedule && todaySchedule.slots?.length > 0;
      }).length,
      busy: doctors.filter(d => d.status === 'active' && appointmentMap[d._id.toString()] > 0).length,
      todayAppointments: Object.values(appointmentMap).reduce((sum, count) => sum + count, 0)
    };

    let formattedDoctors = await Promise.all(doctors.map(async (doc) => {
      // Check if doctor is working today based on availability schedule
      const now = new Date();
      const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
      const todaySchedule = doc.availability?.find(a => a.day === currentDay);
      const isWorkingToday = !!(todaySchedule && todaySchedule.slots?.length > 0);
      
      // Determine status
      let status;
      if (doc.status !== 'active') {
        status = 'off-duty';
      } else if (!isWorkingToday) {
        status = 'on-leave';
      } else if (appointmentMap[doc._id.toString()] > 0) {
        status = 'busy';
      } else {
        status = 'available';
      }
      
      // Get real statistics from database
      const totalAppointments = await Appointment.countDocuments({ doctorId: doc._id });
      const completedAppointments = await Appointment.countDocuments({ 
        doctorId: doc._id, 
        status: 'completed' 
      });
      const noShowAppointments = await Appointment.countDocuments({ 
        doctorId: doc._id, 
        status: 'no-show' 
      });
      const noShowRate = totalAppointments > 0 
        ? Math.round((noShowAppointments / totalAppointments) * 100) 
        : 0;
      
      return {
        _id: doc._id,
        name: doc.name,
        specialty: doc.specialty?.en || doc.specialty,
        experience: doc.experienceYears || 0,
        todayAppointments: appointmentMap[doc._id.toString()] || 0,
        rating: doc.ratingAvg || 0,
        status: status,
        phone: doc.phone,
        email: doc.email,
        bio: doc.bio?.en || doc.bio,
        image: doc.photoUrl || null,
        totalAppointments,
        completedAppointments,
        noShowRate,
        schedule: doc.availability?.map(a => ({
          day: a.day.charAt(0).toUpperCase() + a.day.slice(1),
          startTime: a.slots?.[0]?.from || '',
          endTime: a.slots?.[0]?.to || ''
        })) || []
      };
    }));
    
    // Filter by availability/status if specified
    if (availability && availability !== '') {
      formattedDoctors = formattedDoctors.filter(doc => doc.status === availability);
    }

    res.json({ doctors: formattedDoctors, stats, total: formattedDoctors.length });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ message: 'Error fetching doctors' });
  }
};

// Get Specialties
exports.getSpecialties = async (req, res) => {
  try {
    const manager = await Manager.findById(req.user.id);
    const doctors = await Doctor.find({ clinicId: manager.clinicId }).select('specialty');
    
    const specialties = [...new Set(
      doctors.map(doc => doc.specialty?.en || doc.specialty).filter(Boolean)
    )].sort();
    
    res.json({ specialties });
  } catch (error) {
    console.error('Error fetching specialties:', error);
    res.status(500).json({ message: 'Error fetching specialties' });
  }
};

// Get Doctor Available Dates
exports.getDoctorAvailableDates = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    if (!doctor.availability || doctor.availability.length === 0) {
      return res.json({ dates: [] });
    }

    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    const duration = doctor.consultationDuration || 20;

    for (let i = 0; i < 30; i++) {
      const date = new Date(today.getTime() + (i * 24 * 60 * 60 * 1000));
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
      
      const daySchedule = doctor.availability.find(a => a.day.toLowerCase() === dayName);
      if (daySchedule && daySchedule.slots && daySchedule.slots.length > 0) {
        // Check if it's today
        const isToday = date.toDateString() === now.toDateString();
        
        if (isToday) {
          // Check if there are any available slots left today
          let hasAvailableSlots = false;
          
          for (const slot of daySchedule.slots) {
            const [endHour, endMin] = slot.to.split(':').map(Number);
            const endTimeInMinutes = endHour * 60 + endMin;
            
            // If end time is after current time + duration, there are available slots
            if (endTimeInMinutes > currentTimeInMinutes + duration) {
              hasAvailableSlots = true;
              break;
            }
          }
          
          if (!hasAvailableSlots) continue;
        }
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
      }
    }

    res.json({ dates });
  } catch (error) {
    console.error('Error fetching available dates:', error);
    res.status(500).json({ message: 'Error fetching available dates' });
  }
};

// Get Doctor Available Times
exports.getDoctorAvailableTimes = async (req, res) => {
  try {
    const { date } = req.query;
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const selectedDate = new Date(date + 'T00:00:00.000Z');
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][selectedDate.getUTCDay()];
    
    const daySchedule = doctor.availability?.find(a => a.day.toLowerCase() === dayName);
    if (!daySchedule || !daySchedule.slots || daySchedule.slots.length === 0) {
      return res.json({ times: [] });
    }

    // Get booked appointments for this date
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');
    
    const bookedAppointments = await Appointment.find({
      doctorId: req.params.id,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'confirmed'] }
    }).select('startTime');

    // Get blocked slots for this date
    const blockedSlots = await BlockedSlot.find({
      doctorId: req.params.id,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).select('startTime endTime');

    const bookedTimes = bookedAppointments.map(apt => apt.startTime);
    const times = [];
    const duration = doctor.consultationDuration || 20;

    // Check if selected date is today
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Helper function to check if time is blocked
    const isTimeBlocked = (timeInMinutes) => {
      for (const blocked of blockedSlots) {
        const [blockStartHour, blockStartMin] = blocked.startTime.split(':').map(Number);
        const [blockEndHour, blockEndMin] = blocked.endTime.split(':').map(Number);
        const blockStart = blockStartHour * 60 + blockStartMin;
        const blockEnd = blockEndHour * 60 + blockEndMin;
        
        // Check if the time slot overlaps with blocked period
        if (timeInMinutes >= blockStart && timeInMinutes < blockEnd) {
          return true;
        }
      }
      return false;
    };

    // Generate time slots
    daySchedule.slots.forEach(slot => {
      const [startHour, startMin] = slot.from.split(':').map(Number);
      const [endHour, endMin] = slot.to.split(':').map(Number);
      
      let currentTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      while (currentTime + duration <= endTime) {
        // Skip past times if it's today
        if (isToday && currentTime <= currentTimeInMinutes) {
          currentTime += duration;
          continue;
        }

        // Skip blocked times
        if (isTimeBlocked(currentTime)) {
          currentTime += duration;
          continue;
        }

        const hour = Math.floor(currentTime / 60);
        const min = currentTime % 60;
        const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        
        if (!bookedTimes.includes(timeStr)) {
          // Format to 12-hour with AM/PM
          const hour12 = hour % 12 || 12;
          const ampm = hour >= 12 ? 'PM' : 'AM';
          times.push(`${String(hour12).padStart(2, '0')}:${String(min).padStart(2, '0')} ${ampm}`);
        }
        
        currentTime += duration;
      }
    });

    res.json({ times });
  } catch (error) {
    console.error('Error fetching available times:', error);
    res.status(500).json({ message: 'Error fetching available times' });
  }
};

// Toggle Doctor Status
exports.toggleDoctorStatus = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    doctor.status = doctor.status === 'active' ? 'inactive' : 'active';
    await doctor.save();
    
    res.json({ message: 'Doctor status updated', isAvailable: doctor.status === 'active' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating doctor status' });
  }
};

// Get Patients
exports.getPatients = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    // Get all patients from database
    const total = await Patient.countDocuments();
    const patients = await Patient.find()
      .select('name email phone dateOfBirth gender address bloodType height weight allergies chronicConditions chronicConditionsOther currentMedications notesForDoctor medicalHistory isActive emailVerified lastLoginAt createdAt updatedAt')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    // Get appointment statistics for each patient
    const patientsWithStats = await Promise.all(patients.map(async (patient) => {
      const totalVisits = await Appointment.countDocuments({ patientId: patient._id });
      const lastAppointment = await Appointment.findOne({ patientId: patient._id })
        .sort({ appointmentDate: -1 })
        .select('appointmentDate');
      
      const completedVisits = await Appointment.countDocuments({ 
        patientId: patient._id, 
        status: 'completed' 
      });
      
      const upcomingVisits = await Appointment.countDocuments({ 
        patientId: patient._id, 
        status: { $in: ['pending', 'confirmed'] },
        appointmentDate: { $gte: new Date() }
      });

      return {
        _id: patient._id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        address: patient.address,
        bloodType: patient.bloodType,
        height: patient.height,
        weight: patient.weight,
        allergies: patient.allergies,
        chronicConditions: patient.chronicConditions,
        chronicConditionsOther: patient.chronicConditionsOther,
        currentMedications: patient.currentMedications,
        notesForDoctor: patient.notesForDoctor,
        medicalHistory: patient.medicalHistory,
        isActive: patient.isActive,
        emailVerified: patient.emailVerified,
        lastLoginAt: patient.lastLoginAt,
        lastAppointment: lastAppointment?.appointmentDate || null,
        totalVisits,
        completedVisits,
        upcomingVisits,
        registeredAt: patient.createdAt,
        updatedAt: patient.updatedAt
      };
    }));

    // Calculate stats correctly
    const totalPatients = total;
    
    // Active patients = patients with at least one appointment in last 30 days OR upcoming appointments
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentPatientIds = await Appointment.distinct('patientId', {
      appointmentDate: { $gte: thirtyDaysAgo }
    });
    const activePatients = recentPatientIds.filter(id => id !== null).length;
    
    // New patients this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newPatients = await Patient.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    // Total visits (completed appointments only)
    const totalVisits = await Appointment.countDocuments({ status: 'completed' });

    const stats = {
      total: totalPatients,
      active: activePatients,
      newThisMonth: newPatients,
      totalVisits: totalVisits
    };

    res.json({
      patients: patientsWithStats,
      stats,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ message: 'Error fetching patients' });
  }
};

// Get Reviews
exports.getReviews = async (req, res) => {
  try {
    const manager = await Manager.findById(req.user.id);
    const clinic = await Clinic.findById(manager.clinicId);
    
    // 1. Get clinic reviews from Review collection
    const clinicReviews = await Review.find({ 
      clinicId: manager.clinicId,
      isActive: true,
      doctorId: null
    })
      .populate('patientId', 'name')
      .sort({ createdAt: -1 });

    const formattedClinicReviews = clinicReviews.map(rev => ({
      _id: rev._id,
      patientName: rev.patientName || rev.patientId?.name || 'Anonymous',
      rating: rev.rating,
      comment: rev.comment || '',
      date: rev.createdAt,
      isVerified: rev.isVerified
    }));

    const clinicAvgRating = clinicReviews.length > 0
      ? clinicReviews.reduce((sum, r) => sum + r.rating, 0) / clinicReviews.length
      : clinic?.ratingAvg || 0;

    const clinicRatingDistribution = {
      5: clinicReviews.filter(r => r.rating === 5).length,
      4: clinicReviews.filter(r => r.rating === 4).length,
      3: clinicReviews.filter(r => r.rating === 3).length,
      2: clinicReviews.filter(r => r.rating === 2).length,
      1: clinicReviews.filter(r => r.rating === 1).length,
    };

    // 2. Get all doctors in this clinic with their reviews
    const doctors = await Doctor.find({ 
      clinicId: manager.clinicId,
      status: 'active'
    }).select('name specialty reviews ratingAvg ratingCount');

    const allDoctorReviews = [];
    const doctorReviewsData = [];

    doctors.forEach(doctor => {
      const doctorReviews = [];
      
      if (doctor.reviews && doctor.reviews.length > 0) {
        doctor.reviews.forEach(review => {
          if (review.isVerified) {
            const reviewData = {
              _id: review._id,
              patientName: review.patientName || 'Anonymous',
              doctorName: doctor.name?.en || doctor.name?.ar || doctor.name || 'Unknown',
              doctorId: doctor._id,
              doctorSpecialty: doctor.specialty?.en || doctor.specialty?.ar || doctor.specialty || '',
              rating: review.rating,
              comment: review.comment || '',
              date: review.date || review.createdAt
            };
            allDoctorReviews.push(reviewData);
            doctorReviews.push(reviewData);
          }
        });
      }

      if (doctorReviews.length > 0) {
        const avgRating = doctorReviews.reduce((sum, r) => sum + r.rating, 0) / doctorReviews.length;
        doctorReviewsData.push({
          doctorId: doctor._id,
          doctorName: doctor.name?.en || doctor.name?.ar || doctor.name || 'Unknown',
          doctorSpecialty: doctor.specialty?.en || doctor.specialty?.ar || doctor.specialty || '',
          avgRating: avgRating.toFixed(1),
          totalReviews: doctorReviews.length,
          reviews: doctorReviews
        });
      }
    });

    allDoctorReviews.sort((a, b) => new Date(b.date) - new Date(a.date));

    const doctorAvgRating = allDoctorReviews.length > 0
      ? allDoctorReviews.reduce((sum, r) => sum + r.rating, 0) / allDoctorReviews.length
      : 0;

    const doctorRatingDistribution = {
      5: allDoctorReviews.filter(r => r.rating === 5).length,
      4: allDoctorReviews.filter(r => r.rating === 4).length,
      3: allDoctorReviews.filter(r => r.rating === 3).length,
      2: allDoctorReviews.filter(r => r.rating === 2).length,
      1: allDoctorReviews.filter(r => r.rating === 1).length,
    };

    res.json({
      clinic: {
        avgRating: clinicAvgRating.toFixed(1),
        totalReviews: clinicReviews.length,
        ratingDistribution: clinicRatingDistribution,
        reviews: formattedClinicReviews
      },
      doctors: {
        avgRating: doctorAvgRating.toFixed(1),
        totalReviews: allDoctorReviews.length,
        ratingDistribution: doctorRatingDistribution,
        reviews: allDoctorReviews,
        byDoctor: doctorReviewsData
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Error fetching reviews' });
  }
};

// Get Schedules
exports.getSchedules = async (req, res) => {
  try {
    const manager = await Manager.findById(req.user.id);
    
    const doctors = await Doctor.find({ clinicId: manager.clinicId });

    const schedules = doctors.map(doc => ({
      _id: doc._id,
      doctorName: doc.name,
      specialty: doc.specialty?.en || doc.specialty,
      workingDays: doc.workingHours?.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      workingHours: {
        start: doc.workingHours?.startTime || '09:00',
        end: doc.workingHours?.endTime || '17:00'
      },
      slotDuration: doc.workingHours?.slotDuration || 30
    }));

    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching schedules' });
  }
};

// Update Schedule
exports.updateSchedule = async (req, res) => {
  try {
    const { workingDays, workingHours, slotDuration } = req.body;
    
    await Doctor.findByIdAndUpdate(req.params.id, {
      'workingHours.days': workingDays,
      'workingHours.startTime': workingHours.start,
      'workingHours.endTime': workingHours.end,
      'workingHours.slotDuration': slotDuration
    });

    res.json({ message: 'Schedule updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating schedule' });
  }
};

// Get Clinic
exports.getClinic = async (req, res) => {
  try {
    const manager = await Manager.findById(req.user.id);
    const clinic = await Clinic.findById(manager.clinicId);

    if (!clinic) {
      return res.status(404).json({ message: 'Clinic not found' });
    }

    // Extract working hours from Map or default values
    const workingHoursMap = clinic.workingHours || new Map();
    const workingDays = [];
    let startTime = '09:00';
    let endTime = '17:00';

    // Get working days and hours from the Map
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    daysOfWeek.forEach(day => {
      const daySchedule = workingHoursMap.get(day);
      if (daySchedule && daySchedule.isOpen) {
        workingDays.push(day.charAt(0).toUpperCase() + day.slice(1));
        if (daySchedule.openTime) startTime = daySchedule.openTime;
        if (daySchedule.closeTime) endTime = daySchedule.closeTime;
      }
    });

    // If no working days found, use defaults
    if (workingDays.length === 0) {
      workingDays.push('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday');
    }

    // Extract facilities - keep multilingual format
    const facilities = (clinic.facilities || []).map(f => {
      if (typeof f === 'string') return { en: f, ar: f };
      if (f.name) {
        if (typeof f.name === 'object' && f.name.en && f.name.ar) {
          return f.name;
        }
        if (typeof f.name === 'string') return { en: f.name, ar: f.name };
      }
      return { en: '', ar: '' };
    }).filter(f => f.en !== '' || f.ar !== '');

    res.json({
      _id: clinic._id,
      name: clinic.name || { en: '', ar: '' },
      address: clinic.address || { en: '', ar: '' },
      phone: clinic.phone || '',
      email: clinic.email || '',
      description: clinic.description || { en: '', ar: '' },
      facilities: facilities,
      workingDays: workingDays,
      workingHours: {
        start: startTime,
        end: endTime
      },
      slotDuration: clinic.settings?.defaultAppointmentDuration || 30
    });
  } catch (error) {
    console.error('Error fetching clinic data:', error);
    res.status(500).json({ message: 'Error fetching clinic data' });
  }
};

// Update Clinic
exports.updateClinic = async (req, res) => {
  try {
    const manager = await Manager.findById(req.user.id);
    const { name, address, phone, email, description, facilities, workingDays, workingHours, slotDuration } = req.body;

    const clinic = await Clinic.findById(manager.clinicId);
    if (!clinic) {
      return res.status(404).json({ message: 'Clinic not found' });
    }

    // Update basic info - handle both string and object formats
    if (typeof name === 'object' && name.en && name.ar) {
      clinic.name = name;
    } else if (typeof name === 'string') {
      clinic.name = { en: name, ar: name };
    }

    if (typeof address === 'object' && address.en && address.ar) {
      clinic.address = address;
    } else if (typeof address === 'string') {
      clinic.address = { en: address, ar: address };
    }

    clinic.phone = phone;
    clinic.email = email;

    if (typeof description === 'object' && description.en && description.ar) {
      clinic.description = description;
    } else if (typeof description === 'string') {
      clinic.description = { en: description, ar: description };
    }

    // Update facilities - handle multilingual format
    if (facilities && Array.isArray(facilities)) {
      clinic.facilities = facilities.map(f => {
        if (typeof f === 'object' && f.en && f.ar) {
          return {
            name: { en: f.en, ar: f.ar },
            icon: 'facility'
          };
        } else if (typeof f === 'string') {
          return {
            name: { en: f, ar: f },
            icon: 'facility'
          };
        }
        return {
          name: { en: '', ar: '' },
          icon: 'facility'
        };
      });
    }

    // Update working hours Map
    const workingHoursMap = new Map();
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    daysOfWeek.forEach(day => {
      const isOpen = workingDays && workingDays.some(d => d.toLowerCase() === day);
      workingHoursMap.set(day, {
        isOpen: isOpen,
        openTime: isOpen ? workingHours.start : '',
        closeTime: isOpen ? workingHours.end : ''
      });
    });

    clinic.workingHours = workingHoursMap;

    // Update slot duration in settings
    if (!clinic.settings) {
      clinic.settings = {};
    }
    clinic.settings.defaultAppointmentDuration = slotDuration || 30;

    await clinic.save();

    res.json({ message: 'Clinic updated successfully' });
  } catch (error) {
    console.error('Error updating clinic:', error);
    res.status(500).json({ message: 'Error updating clinic', error: error.message });
  }
};

// Get Available Doctors (not assigned to clinic)
exports.getAvailableDoctors = async (req, res) => {
  try {
    const manager = await Manager.findById(req.user.id);
    
    // Get all doctors from the system (you might want to filter by some criteria)
    const allDoctors = await Doctor.find({ status: 'active' });
    
    // Get doctors already in this clinic
    const clinicDoctors = await Doctor.find({ clinicId: manager.clinicId }).select('_id');
    const clinicDoctorIds = clinicDoctors.map(d => d._id.toString());
    
    // Filter out doctors already in clinic
    const availableDoctors = allDoctors.filter(d => !clinicDoctorIds.includes(d._id.toString()));
    
    const formattedDoctors = availableDoctors.map(doc => ({
      _id: doc._id,
      name: doc.name,
      specialty: doc.specialty?.en || doc.specialty,
      experience: doc.experienceYears || 0,
      email: doc.email
    }));

    res.json(formattedDoctors);
  } catch (error) {
    console.error('Error fetching available doctors:', error);
    res.status(500).json({ message: 'Error fetching available doctors' });
  }
};

// Assign Doctor to Clinic
exports.assignDoctor = async (req, res) => {
  try {
    const manager = await Manager.findById(req.user.id);
    const { doctorId } = req.body;
    
    await Doctor.findByIdAndUpdate(doctorId, {
      clinicId: manager.clinicId
    });

    res.json({ message: 'Doctor assigned successfully' });
  } catch (error) {
    console.error('Error assigning doctor:', error);
    res.status(500).json({ message: 'Error assigning doctor' });
  }
};

// Create New Doctor
exports.createDoctor = async (req, res) => {
  try {
    const manager = await Manager.findById(req.user.id);
    const clinic = await Clinic.findById(manager.clinicId);
    
    if (!clinic) {
      return res.status(404).json({ message: 'Clinic not found' });
    }

    const doctorData = {
      ...req.body,
      clinicId: manager.clinicId,
      businessId: clinic.businessId,
      status: 'active'
    };

    const doctor = await Doctor.create(doctorData);
    res.status(201).json({ message: 'Doctor created successfully', doctor });
  } catch (error) {
    console.error('Error creating doctor:', error);
    res.status(500).json({ message: 'Error creating doctor', error: error.message });
  }
};

// Deactivate Doctor
exports.deactivateDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    doctor.status = doctor.status === 'active' ? 'inactive' : 'active';
    await doctor.save();

    res.json({ 
      message: doctor.status === 'active' ? 'Doctor activated successfully' : 'Doctor deactivated successfully',
      status: doctor.status
    });
  } catch (error) {
    console.error('Error toggling doctor status:', error);
    res.status(500).json({ message: 'Error updating doctor status' });
  }
};

// Update Doctor Schedule
exports.updateDoctorSchedule = async (req, res) => {
  try {
    const { schedule } = req.body;
    
    // Convert schedule format
    const availability = schedule.map(slot => ({
      day: slot.day.toLowerCase(),
      slots: [{
        from: slot.startTime,
        to: slot.endTime
      }]
    }));

    await Doctor.findByIdAndUpdate(req.params.id, {
      availability
    });

    res.json({ message: 'Schedule updated successfully' });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ message: 'Error updating schedule' });
  }
};

// Get Blocked Slots
exports.getBlockedSlots = async (req, res) => {
  try {
    const manager = await Manager.findById(req.user.id);
    const clinicDoctors = await Doctor.find({ clinicId: manager.clinicId }).select('_id');
    const doctorIds = clinicDoctors.map(d => d._id);

    const blockedSlots = await BlockedSlot.find({
      doctorId: { $in: doctorIds }
    }).populate('doctorId', 'name').sort({ date: 1, startTime: 1 });

    res.json({ blockedSlots });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching blocked slots' });
  }
};

// Create Blocked Slot
exports.createBlockedSlot = async (req, res) => {
  try {
    const { doctorId, date, startTime, endTime, reason } = req.body;
    const manager = await Manager.findById(req.user.id);

    const doctor = await Doctor.findById(doctorId);
    if (!doctor || doctor.clinicId.toString() !== manager.clinicId.toString()) {
      return res.status(403).json({ message: 'Doctor not in your clinic' });
    }

    const blockedSlot = await BlockedSlot.create({
      doctorId,
      date,
      startTime,
      endTime,
      reason,
      createdBy: req.user.id
    });

    res.status(201).json({ message: 'Time slot blocked successfully', blockedSlot });
  } catch (error) {
    res.status(500).json({ message: 'Error creating blocked slot' });
  }
};

// Delete Blocked Slot
exports.deleteBlockedSlot = async (req, res) => {
  try {
    await BlockedSlot.findByIdAndDelete(req.params.id);
    res.json({ message: 'Blocked slot removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting blocked slot' });
  }
};

// Get Schedule Stats
exports.getScheduleStats = async (req, res) => {
  try {
    const manager = await Manager.findById(req.user.id);
    const clinicDoctors = await Doctor.find({ clinicId: manager.clinicId }).select('_id');
    const doctorIds = clinicDoctors.map(d => d._id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's appointments
    const appointmentsToday = await Appointment.countDocuments({
      doctorId: { $in: doctorIds },
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: { $in: ['confirmed', 'pending'] }
    });

    // Calculate available slots for today
    const now = new Date();
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    
    let totalSlots = 0;
    for (const doctor of await Doctor.find({ _id: { $in: doctorIds }, status: 'active' })) {
      const todaySchedule = doctor.availability?.find(a => a.day === currentDay);
      if (todaySchedule && todaySchedule.slots) {
        todaySchedule.slots.forEach(slot => {
          const [startHour, startMin] = slot.from.split(':').map(Number);
          const [endHour, endMin] = slot.to.split(':').map(Number);
          const duration = doctor.consultationDuration || 20;
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          totalSlots += Math.floor((endMinutes - startMinutes) / duration);
        });
      }
    }

    const bookedSlots = await Appointment.countDocuments({
      doctorId: { $in: doctorIds },
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: { $in: ['confirmed', 'pending'] }
    });

    const availableSlots = Math.max(0, totalSlots - bookedSlots);

    // Busy doctors (have appointments today)
    const busyDoctorIds = await Appointment.distinct('doctorId', {
      doctorId: { $in: doctorIds },
      appointmentDate: { $gte: today, $lt: tomorrow },
      status: { $in: ['confirmed', 'pending'] }
    });

    const busyDoctors = busyDoctorIds.length;
    const freeDoctors = doctorIds.length - busyDoctors;

    res.json({
      appointmentsToday,
      availableSlots,
      busyDoctors,
      freeDoctors
    });
  } catch (error) {
    console.error('Error fetching schedule stats:', error);
    res.status(500).json({ message: 'Error fetching schedule stats' });
  }
};

// Delete Review
exports.deleteReview = async (req, res) => {
  try {
    const manager = await Manager.findById(req.user.id);
    const { reviewId } = req.params;
    const { type } = req.query;

    if (type === 'clinic') {
      const review = await Review.findById(reviewId);
      
      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }

      if (review.clinicId.toString() !== manager.clinicId.toString()) {
        return res.status(403).json({ message: 'Unauthorized to delete this review' });
      }

      await Review.findByIdAndDelete(reviewId);
      res.json({ message: 'Review deleted successfully' });
    } else if (type === 'doctor') {
      const { doctorId } = req.body;
      
      const doctor = await Doctor.findById(doctorId);
      
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }

      if (doctor.clinicId.toString() !== manager.clinicId.toString()) {
        return res.status(403).json({ message: 'Unauthorized to delete this review' });
      }

      doctor.reviews = doctor.reviews.filter(r => r._id.toString() !== reviewId);
      await doctor.save();

      res.json({ message: 'Review deleted successfully' });
    } else {
      res.status(400).json({ message: 'Invalid review type' });
    }
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Error deleting review' });
  }
};
