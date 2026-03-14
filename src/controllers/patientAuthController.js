const jwt = require('jsonwebtoken');
const Patient = require('../models/Patient');
const Owner = require('../models/Owner');
const Manager = require('../models/Manager');
const Doctor = require('../models/Doctor');

const signToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const buildPatientResponse = (patient) => ({
  id: patient._id,
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
  role: 'patient'
});

exports.patientRegister = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password'
      });
    }

    const existingPatient = await Patient.findOne({ email: email.toLowerCase() });
    if (existingPatient) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const patient = await Patient.create({
      name,
      email: email.toLowerCase(),
      passwordHash: password,
      phone: phone || '+1234567890'
    });

    const token = signToken(patient._id, 'patient');

    res.status(201).json({
      success: true,
      token,
      user: buildPatientResponse(patient)
    });
  } catch (error) {
    console.error('Patient registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during registration'
    });
  }
};

exports.patientLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const patient = await Patient.findOne({ email: email.toLowerCase() }).select('+passwordHash');

    if (!patient) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (patient.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is locked. Please try again later'
      });
    }

    const isPasswordCorrect = await patient.comparePassword(password);

    if (!isPasswordCorrect) {
      await patient.incrementLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!patient.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    await patient.resetLoginAttempts();

    const token = signToken(patient._id, 'patient');

    res.status(200).json({
      success: true,
      token,
      user: buildPatientResponse(patient)
    });
  } catch (error) {
    console.error('Patient login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login'
    });
  }
};

exports.patientGoogleRegister = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'Google access token is required' });
    }

    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!googleRes.ok) {
      return res.status(401).json({ success: false, message: 'Invalid Google token' });
    }

    const { sub: googleId, email, name } = await googleRes.json();
    const lowerEmail = email.toLowerCase();

    // Check if email exists in any role
    const [owner, manager, doctor, patient] = await Promise.all([
      Owner.findOne({ email: lowerEmail }),
      Manager.findOne({ email: lowerEmail }),
      Doctor.findOne({ email: lowerEmail }),
      Patient.findOne({ email: lowerEmail }),
    ]);

    if (owner || manager || doctor || patient) {
      return res.status(409).json({
        success: false,
        code: 'ACCOUNT_EXISTS',
        message: 'An account with this email already exists. Please sign in instead.',
        messageAr: 'يوجد حساب بهذا البريد الإلكتروني بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.',
      });
    }

    const newPatient = await Patient.create({
      name,
      email: lowerEmail,
      googleId,
      authProvider: 'google',
      phone: '+0000000000',
    });

    const token = signToken(newPatient._id, 'patient');

    res.status(201).json({
      success: true,
      token,
      user: buildPatientResponse(newPatient)
    });
  } catch (error) {
    console.error('Google register error:', error);
    res.status(500).json({ success: false, message: 'Error during Google registration' });
  }
};

exports.patientGoogleAuth = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'Google access token is required' });
    }

    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!googleRes.ok) {
      return res.status(401).json({ success: false, message: 'Invalid Google token' });
    }

    const { sub: googleId, email, name } = await googleRes.json();
    const lowerEmail = email.toLowerCase();

    // Check Owner
    const owner = await Owner.findOne({ email: lowerEmail });
    if (owner) {
      if (!owner.isActive) return res.status(403).json({ success: false, message: 'Account is inactive' });
      const token = signToken(owner._id, 'owner');
      return res.status(200).json({
        success: true,
        token,
        user: { id: owner._id, name: owner.name, email: owner.email, role: 'owner', businessId: owner.businessId }
      });
    }

    // Check Manager
    const manager = await Manager.findOne({ email: lowerEmail }).populate('clinicId');
    if (manager) {
      if (!manager.isActive) return res.status(403).json({ success: false, message: 'Account is inactive' });
      const token = signToken(manager._id, 'manager');
      return res.status(200).json({
        success: true,
        token,
        user: {
          id: manager._id, name: manager.name, email: manager.email, role: 'manager',
          businessId: manager.businessId, clinicId: manager.clinicId?._id, clinicName: manager.clinicId?.name
        }
      });
    }

    // Check Doctor
    const doctor = await Doctor.findOne({ email: lowerEmail });
    if (doctor) {
      if (doctor.status !== 'active') return res.status(403).json({ success: false, message: 'Account is inactive' });
      const token = signToken(doctor._id, 'doctor');
      const doctorData = doctor.toObject();
      delete doctorData.auth;
      return res.status(200).json({
        success: true,
        token,
        user: { ...doctorData, id: doctor._id, role: 'doctor' }
      });
    }

    // Patient - find or create
    let patient = await Patient.findOne({ email: lowerEmail });

    if (patient) {
      if (!patient.googleId) {
        patient.googleId = googleId;
        patient.authProvider = 'google';
        await patient.save({ validateModifiedOnly: true });
      }
    } else {
      patient = await Patient.create({
        name,
        email: lowerEmail,
        googleId,
        authProvider: 'google',
        phone: '+0000000000',
      });
    }

    if (!patient.isActive) {
      return res.status(403).json({ success: false, message: 'Account is inactive' });
    }

    const token = signToken(patient._id, 'patient');

    res.status(200).json({
      success: true,
      token,
      user: buildPatientResponse(patient)
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during Google authentication'
    });
  }
};
