const jwt = require('jsonwebtoken');
const Owner = require('../models/Owner');
const Manager = require('../models/Manager');
const Doctor = require('../models/Doctor');
const Business = require('../models/Business');
const Clinic = require('../models/Clinic');

const signToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

exports.ownerRegister = async (req, res) => {
  try {
    const { name, email, password, businessName, phone } = req.body;

    if (!name || !email || !password || !businessName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const existingOwner = await Owner.findOne({ email: email.toLowerCase() });
    if (existingOwner) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const business = await Business.create({
      name: businessName,
      email: email,
      phone: phone || '',
    });

    const owner = await Owner.create({
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash: password,
      businessId: business._id,
      emailVerified: false,
    });

    const token = signToken(owner._id, 'owner');

    res.status(201).json({
      success: true,
      token,
      user: {
        id: owner._id,
        name: owner.name,
        email: owner.email,
        role: 'owner',
        businessId: business._id
      }
    });
  } catch (error) {
    console.error('Owner registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during registration',
      error: error.message
    });
  }
};

exports.ownerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const owner = await Owner.findOne({ email: email.toLowerCase() }).select('+passwordHash');

    if (!owner) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (owner.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is locked. Please try again later'
      });
    }

    const isPasswordCorrect = await owner.comparePassword(password);

    if (!isPasswordCorrect) {
      await owner.incrementLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!owner.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    await owner.resetLoginAttempts();

    const token = signToken(owner._id, 'owner');

    res.status(200).json({
      success: true,
      token,
      user: {
        id: owner._id,
        name: owner.name,
        email: owner.email,
        role: 'owner'
      }
    });
  } catch (error) {
    console.error('Owner login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login'
    });
  }
};

exports.managerLogin = async (req, res) => {
  try {
    const { email, password, businessId } = req.body;

    if (!email || !password || !businessId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, password and clinic'
      });
    }

    // Find manager by clinicId (businessId from frontend is actually clinicId)
    const manager = await Manager.findOne({ 
      email: email.toLowerCase(),
      clinicId: businessId 
    }).select('+passwordHash').populate('clinicId');

    if (!manager) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (manager.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is locked. Please try again later'
      });
    }

    const isPasswordCorrect = await manager.comparePassword(password);

    if (!isPasswordCorrect) {
      await manager.incrementLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!manager.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    await manager.resetLoginAttempts();

    const token = signToken(manager._id, 'manager');

    res.status(200).json({
      success: true,
      token,
      user: {
        id: manager._id,
        name: manager.name,
        email: manager.email,
        role: 'manager',
        businessId: manager.businessId,
        clinicId: manager.clinicId._id,
        clinicName: manager.clinicId.name
      }
    });
  } catch (error) {
    console.error('Manager login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login'
    });
  }
};

exports.doctorLogin = async (req, res) => {
  try {
    const { email, password, businessId } = req.body;

    if (!email || !password || !businessId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, password and business ID'
      });
    }

    const doctor = await Doctor.findByClinicAndEmail(businessId, email);

    if (!doctor) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (doctor.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is locked. Please try again later'
      });
    }

    const isPasswordCorrect = await doctor.comparePassword(password);

    if (!isPasswordCorrect) {
      await doctor.incrementLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (doctor.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated by the manager',
        messageAr: 'تم إلغاء تفعيل حسابك من قبل المدير',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    await doctor.resetLoginAttempts();

    const token = signToken(doctor._id, 'doctor');

    const doctorData = doctor.toObject();
    delete doctorData.auth;

    res.status(200).json({
      success: true,
      token,
      user: {
        ...doctorData,
        id: doctor._id,
        role: 'doctor'
      }
    });
  } catch (error) {
    console.error('Doctor login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login'
    });
  }
};

exports.staffLogin = async (req, res) => {
  try {
    return res.status(501).json({
      success: false,
      message: 'Staff login not implemented yet'
    });
  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login'
    });
  }
};

exports.getBusinessByEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email'
      });
    }

    const manager = await Manager.findOne({ email: email.toLowerCase() });
    if (manager) {
      return res.status(200).json({
        success: true,
        businessId: manager.businessId,
        role: 'manager'
      });
    }

    const doctor = await Doctor.findOne({ email: email.toLowerCase() });
    if (doctor) {
      return res.status(200).json({
        success: true,
        businessId: doctor.businessId,
        role: 'doctor'
      });
    }

    const staff = await Manager.findOne({ email: email.toLowerCase(), position: 'staff' });
    if (staff) {
      return res.status(200).json({
        success: true,
        businessId: staff.businessId,
        role: 'staff'
      });
    }

    const owner = await Owner.findOne({ email: email.toLowerCase() });
    if (owner) {
      return res.status(200).json({
        success: true,
        role: 'owner'
      });
    }

    return res.status(404).json({
      success: false,
      message: 'No account found with this email'
    });
  } catch (error) {
    console.error('Get business error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching business'
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        businessId: req.user.businessId
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user data'
    });
  }
};

exports.getAllBusinesses = async (req, res) => {
  try {
    const clinics = await Clinic.find({ isActive: true })
      .select('_id name businessId')
      .sort({ 'name.ar': 1 });

    res.status(200).json({
      success: true,
      data: clinics
    });
  } catch (error) {
    console.error('Get businesses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching businesses'
    });
  }
};
