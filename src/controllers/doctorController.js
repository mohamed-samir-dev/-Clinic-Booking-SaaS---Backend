const Doctor = require('../models/Doctor');
const Clinic = require('../models/Clinic');

exports.createDoctor = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const businessId = req.user.businessId;

    const clinic = await Clinic.findOne({ _id: req.body.clinicId, businessId });
    if (!clinic) {
      return res.status(404).json({ message: 'Clinic not found' });
    }

    const doctorData = {
      ...req.body,
      businessId,
      createdBy: ownerId,
    };

    const doctor = await Doctor.create(doctorData);
    
    res.status(201).json(doctor);
  } catch (error) {
    console.error('Create doctor error:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.getDoctors = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const doctors = await Doctor.find({ businessId })
      .populate('clinicId', 'name')
      .sort({ createdAt: -1 });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDoctorById = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const doctor = await Doctor.findOne({ _id: req.params.id, businessId })
      .populate('clinicId', 'name');
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateDoctor = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const ownerId = req.user.id;

    const doctor = await Doctor.findOneAndUpdate(
      { _id: req.params.id, businessId },
      { ...req.body, updatedBy: ownerId },
      { new: true, runValidators: true }
    );

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteDoctor = async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const doctor = await Doctor.findOneAndDelete({ _id: req.params.id, businessId });

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTopDoctors = async (req, res) => {
  try {
    const { specialty, limit = 4 } = req.query;
    
    const query = { status: 'active' };
    if (specialty) {
      query.$or = [
        { 'specialty.en': specialty },
        { 'specialty.ar': specialty }
      ];
    }
    
    const doctors = await Doctor.find(query)
      .sort({ ratingAvg: -1, experienceYears: -1 })
      .limit(parseInt(limit))
      .populate('clinicId', 'name');
    
    res.json(doctors);
  } catch (error) {
    console.error('getTopDoctors error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getAllDoctorsWithFilters = async (req, res) => {
  try {
    const { specialty, gender, isAvailableToday, minExperience } = req.query;
    
    const query = { status: 'active' };
    
    if (specialty) {
      query.$or = [
        { 'specialty.en': specialty },
        { 'specialty.ar': specialty }
      ];
    }
    
    if (gender) {
      query.gender = gender;
    }
    
    if (isAvailableToday === 'true') {
      query.isAvailableToday = true;
    }
    
    if (minExperience) {
      query.experienceYears = { $gte: parseInt(minExperience) };
    }
    
    const doctors = await Doctor.find(query)
      .sort({ ratingAvg: -1, experienceYears: -1 })
      .populate('clinicId', 'name');
    
    res.json(doctors);
  } catch (error) {
    console.error('getAllDoctorsWithFilters error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getFilterOptions = async (req, res) => {
  try {
    const doctors = await Doctor.find({ status: 'active' }).select('specialty gender');
    
    const specialtiesMap = new Map();
    doctors.forEach(doctor => {
      if (doctor.specialty?.en) {
        specialtiesMap.set(doctor.specialty.en, {
          en: doctor.specialty.en,
          ar: doctor.specialty.ar || doctor.specialty.en
        });
      }
    });
    
    const specialties = Array.from(specialtiesMap.values());
    const genders = await Doctor.distinct('gender', { status: 'active' });
    
    res.json({
      specialties: specialties.filter(Boolean),
      genders: genders.filter(Boolean)
    });
  } catch (error) {
    console.error('getFilterOptions error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getDoctorByIdPublic = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ _id: req.params.id, status: 'active' })
      .populate('clinicId', 'name');
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.json(doctor);
  } catch (error) {
    console.error('getDoctorByIdPublic error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getDoctorAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findOne({ _id: id, status: 'active' });
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    res.json({
      availability: doctor.availability || [],
      consultationDuration: doctor.consultationDuration || 30
    });
  } catch (error) {
    console.error('getDoctorAvailability error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getDoctorProfile = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const doctor = await Doctor.findById(doctorId)
      .populate('clinicId', 'name logo')
      .select('-auth.passwordHash')
      .lean();
    
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // تنظيف specializations إذا كانت strings بدلاً من objects
    if (doctor.specializations && Array.isArray(doctor.specializations)) {
      doctor.specializations = doctor.specializations.map(spec => {
        if (typeof spec === 'string') {
          return { en: spec, ar: spec };
        }
        return spec;
      });
    }
    
    res.json(doctor);
  } catch (error) {
    console.error('getDoctorProfile error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateDoctorProfile = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { firstName, lastName, name, email, fees, consultationDuration, phone, location, password, availability, aboutUs, education, monthlyRevenue } = req.body;
    
    const updateFields = {};
    
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (fees !== undefined) updateFields.fees = fees;
    if (consultationDuration) updateFields.consultationDuration = consultationDuration;
    if (phone !== undefined) updateFields.phone = phone;
    if (location) updateFields.location = location;
    if (aboutUs) updateFields.aboutUs = aboutUs;
    if (education) updateFields.education = education;
    if (monthlyRevenue !== undefined) updateFields.monthlyRevenue = monthlyRevenue;
    
    if (password && password.trim() !== '') {
      const bcrypt = require('bcrypt');
      const salt = await bcrypt.genSalt(12);
      updateFields['auth.passwordHash'] = await bcrypt.hash(password, salt);
      updateFields['auth.passwordChangedAt'] = Date.now() - 1000;
    }
    
    if (availability) {
      const doctor = await Doctor.findById(doctorId).select('clinicId').lean();
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      
      const clinic = await Clinic.findById(doctor.clinicId);
      if (!clinic) {
        return res.status(404).json({ message: 'Clinic not found' });
      }
      
      for (const daySchedule of availability) {
        const normalizedDay = daySchedule.day.charAt(0).toUpperCase() + daySchedule.day.slice(1).toLowerCase();
        const clinicDay = clinic.workingHours?.get(normalizedDay);
        
        if (!clinicDay || !clinicDay.isOpen) {
          return res.status(400).json({ 
            message: `Clinic is closed on ${daySchedule.day}` 
          });
        }
        
        for (const slot of daySchedule.slots) {
          if (slot.from < clinicDay.openTime || slot.to > clinicDay.closeTime) {
            return res.status(400).json({ 
              message: `Working hours on ${daySchedule.day} must be within clinic hours (${clinicDay.openTime} - ${clinicDay.closeTime})` 
            });
          }
        }
      }
      
      updateFields.availability = availability;
    }
    
    const updatedDoctor = await Doctor.findByIdAndUpdate(
      doctorId,
      { $set: updateFields },
      { new: true, runValidators: true, select: '-auth.passwordHash' }
    ).lean();
    
    if (!updatedDoctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }
    
    // تنظيف specializations إذا كانت strings بدلاً من objects
    if (updatedDoctor.specializations && Array.isArray(updatedDoctor.specializations)) {
      updatedDoctor.specializations = updatedDoctor.specializations.map(spec => {
        if (typeof spec === 'string') {
          return { en: spec, ar: spec };
        }
        return spec;
      });
    }
    
    res.json(updatedDoctor);
  } catch (error) {
    console.error('updateDoctorProfile error:', error);
    res.status(400).json({ message: error.message });
  }
};
