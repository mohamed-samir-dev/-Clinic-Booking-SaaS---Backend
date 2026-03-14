const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const mongoose = require('mongoose');

/**
 * Get patient medical information for doctor
 * Only accessible if there's an appointment between doctor and patient
 */
exports.getPatientMedicalInfo = async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user._id || req.user.id;

    // Verify there's an appointment between doctor and patient
    const appointment = await Appointment.findOne({
      doctorId: new mongoose.Types.ObjectId(doctorId),
      patientId: new mongoose.Types.ObjectId(patientId),
      status: { $in: ['pending', 'confirmed', 'completed'] }
    });

    if (!appointment) {
      return res.status(403).json({ 
        message: 'No appointment found with this patient',
        hasAccess: false 
      });
    }

    // Get patient medical information
    const patient = await Patient.findById(patientId).select(
      'name email phone dateOfBirth gender bloodType height weight allergies chronicConditions chronicConditionsOther currentMedications notesForDoctor'
    );

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    res.json({
      success: true,
      hasAccess: true,
      medicalInfo: {
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        bloodType: patient.bloodType,
        height: patient.height,
        weight: patient.weight,
        allergies: patient.allergies || [],
        chronicConditions: patient.chronicConditions || [],
        chronicConditionsOther: patient.chronicConditionsOther,
        currentMedications: patient.currentMedications || [],
        notesForDoctor: patient.notesForDoctor
      }
    });
  } catch (error) {
    console.error('Get patient medical info error:', error);
    res.status(500).json({ message: 'Error fetching patient medical information', error: error.message });
  }
};
