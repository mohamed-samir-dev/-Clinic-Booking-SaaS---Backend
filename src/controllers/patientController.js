const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');

exports.updatePatientProfile = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { name, email, phone, dateOfBirth, gender, address } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) {
      const existingPatient = await Patient.findOne({ email: email.toLowerCase(), _id: { $ne: patientId } });
      if (existingPatient) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use'
        });
      }
      updateData.email = email.toLowerCase();
    }
    if (phone) updateData.phone = phone;
    if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
    if (gender) updateData.gender = gender.toLowerCase();
    if (address) updateData.address = address;

    const patient = await Patient.findByIdAndUpdate(
      patientId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    const patient = await Patient.findById(patientId).select('+passwordHash');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const isPasswordCorrect = await patient.comparePassword(currentPassword);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    patient.passwordHash = newPassword;
    await patient.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your password to confirm'
      });
    }

    const patient = await Patient.findById(patientId).select('+passwordHash');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const isPasswordCorrect = await patient.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    await Patient.findByIdAndDelete(patientId);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account'
    });
  }
};

exports.getPatientProfile = async (req, res) => {
  try {
    const patient = await Patient.findById(req.user.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};

exports.updateMedicalInfo = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { 
      bloodType, 
      height, 
      weight, 
      allergies, 
      chronicConditions,
      chronicConditionsOther,
      currentMedications,
      notesForDoctor 
    } = req.body;

    const updateData = {};
    if (bloodType !== undefined) updateData.bloodType = bloodType;
    if (height !== undefined) updateData.height = height;
    if (weight !== undefined) updateData.weight = weight;
    if (allergies !== undefined) updateData.allergies = allergies;
    if (chronicConditions !== undefined) updateData.chronicConditions = chronicConditions;
    if (chronicConditionsOther !== undefined) updateData.chronicConditionsOther = chronicConditionsOther;
    if (currentMedications !== undefined) updateData.currentMedications = currentMedications;
    if (notesForDoctor !== undefined) updateData.notesForDoctor = notesForDoctor;

    const patient = await Patient.findByIdAndUpdate(
      patientId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Medical information updated successfully',
      data: patient
    });
  } catch (error) {
    console.error('Update medical info error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating medical information'
    });
  }
};

exports.getPatientAppointments = async (req, res) => {
  try {
    const patientId = req.user.id;
    
    const appointments = await Appointment.find({ patientId })
      .populate({
        path: 'doctorId',
        select: 'name specialty photoUrl clinicId',
        populate: {
          path: 'clinicId',
          select: 'name'
        }
      })
      .populate('businessId', 'name')
      .sort({ appointmentDate: -1 });

    res.status(200).json({
      success: true,
      appointments
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointments'
    });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { id } = req.params;

    const appointment = await Appointment.findOne({ _id: id, patientId });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Appointment is already cancelled'
      });
    }

    const appointmentDate = new Date(appointment.appointmentDate);
    const now = new Date();
    const hoursDiff = (appointmentDate - now) / (1000 * 60 * 60);

    if (hoursDiff < 24) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel appointment less than 24 hours before scheduled time'
      });
    }

    appointment.status = 'cancelled';
    appointment.cancelledBy = 'patient';
    appointment.cancelledAt = new Date();
    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling appointment'
    });
  }
};

exports.rescheduleAppointment = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { id } = req.params;
    const { appointmentDate, startTime, endTime } = req.body;

    const appointment = await Appointment.findOne({ _id: id, patientId });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reschedule this appointment'
      });
    }

    // Validate that the NEW appointment is in the future
    const newDate = new Date(appointmentDate);
    const [newHours, newMinutes] = startTime.split(':').map(Number);
    newDate.setHours(newHours, newMinutes, 0, 0);
    
    const now = new Date();

    if (newDate <= now) {
      return res.status(400).json({
        success: false,
        message: 'New appointment time must be in the future'
      });
    }

    appointment.appointmentDate = appointmentDate;
    appointment.startTime = startTime;
    appointment.endTime = endTime;
    appointment.status = 'pending';
    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully',
      appointment
    });
  } catch (error) {
    console.error('Reschedule appointment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rescheduling appointment'
    });
  }
};

exports.addReview = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { id } = req.params;
    const { rating, comment } = req.body;

    const appointment = await Appointment.findOne({ _id: id, patientId });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    if (appointment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only review completed appointments'
      });
    }

    // Here you would typically create a Review document
    // For now, we'll just return success
    res.status(200).json({
      success: true,
      message: 'Review added successfully'
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding review'
    });
  }
};

exports.addFavoriteDoctor = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { doctorId } = req.params;

    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    if (patient.favoriteDoctors.includes(doctorId)) {
      return res.status(400).json({
        success: false,
        message: 'Doctor already in favorites'
      });
    }

    patient.favoriteDoctors.push(doctorId);
    await patient.save();

    res.status(200).json({
      success: true,
      message: 'Doctor added to favorites'
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding doctor to favorites'
    });
  }
};

exports.removeFavoriteDoctor = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { doctorId } = req.params;

    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    patient.favoriteDoctors = patient.favoriteDoctors.filter(
      id => id.toString() !== doctorId
    );
    await patient.save();

    res.status(200).json({
      success: true,
      message: 'Doctor removed from favorites'
    });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing doctor from favorites'
    });
  }
};

exports.getFavoriteDoctors = async (req, res) => {
  try {
    const patientId = req.user.id;

    const patient = await Patient.findById(patientId).populate({
      path: 'favoriteDoctors',
      select: 'name specialty experienceYears photoUrl availability clinicId',
      populate: {
        path: 'clinicId',
        select: 'name'
      }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      data: patient.favoriteDoctors
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching favorite doctors'
    });
  }
};

exports.addFavoriteClinic = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { clinicId } = req.params;

    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    if (patient.favoriteClinics.includes(clinicId)) {
      return res.status(400).json({
        success: false,
        message: 'Clinic already in favorites'
      });
    }

    patient.favoriteClinics.push(clinicId);
    await patient.save();

    res.status(200).json({
      success: true,
      message: 'Clinic added to favorites'
    });
  } catch (error) {
    console.error('Add favorite clinic error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding clinic to favorites'
    });
  }
};

exports.removeFavoriteClinic = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { clinicId } = req.params;

    const patient = await Patient.findById(patientId);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    patient.favoriteClinics = patient.favoriteClinics.filter(
      id => id.toString() !== clinicId
    );
    await patient.save();

    res.status(200).json({
      success: true,
      message: 'Clinic removed from favorites'
    });
  } catch (error) {
    console.error('Remove favorite clinic error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing clinic from favorites'
    });
  }
};

exports.getFavoriteClinics = async (req, res) => {
  try {
    const patientId = req.user.id;

    const patient = await Patient.findById(patientId).populate({
      path: 'favoriteClinics',
      select: 'name logo address phone'
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      data: patient.favoriteClinics
    });
  } catch (error) {
    console.error('Get favorite clinics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching favorite clinics'
    });
  }
};
