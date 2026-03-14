const jwt = require('jsonwebtoken');
const Owner = require('../models/Owner');
const Manager = require('../models/Manager');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');

exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Please login to access this resource'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let user;
    const role = decoded.role;

    if (role === 'owner') {
      user = await Owner.findById(decoded.id).select('-passwordHash');
    } else if (role === 'manager') {
      user = await Manager.findById(decoded.id).select('-passwordHash');
    } else if (role === 'doctor') {
      user = await Doctor.findById(decoded.id).select('-auth.passwordHash');
    } else if (role === 'staff') {
      user = await Manager.findById(decoded.id).select('-passwordHash');
    } else if (role === 'patient') {
      user = await Patient.findById(decoded.id).select('-passwordHash');
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    if (role === 'doctor' && user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    if (role !== 'doctor' && !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'Password recently changed. Please login again'
      });
    }

    req.user = { ...user.toObject(), id: decoded.id, role };
    req.businessId = user.businessId || null;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

exports.authenticate = exports.protect;

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let user;
    const role = decoded.role;

    if (role === 'patient') {
      user = await Patient.findById(decoded.id).select('-passwordHash');
    }
    
    if (user && user.isActive) {
      req.user = { ...user.toObject(), id: decoded.id, role };
    }

    next();
  } catch (error) {
    next();
  }
};

exports.authenticateDoctor = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Please login to access this resource'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Doctors only.'
      });
    }

    const doctor = await Doctor.findById(decoded.id).select('-auth.passwordHash');
    
    if (!doctor || doctor.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Doctor not found or inactive'
      });
    }

    req.user = { ...doctor.toObject(), id: decoded.id, role: 'doctor' };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};
