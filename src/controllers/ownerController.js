const Owner = require('../models/Owner');
const Doctor = require('../models/Doctor');
const Clinic = require('../models/Clinic');
const Manager = require('../models/Manager');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');

exports.getProfile = async (req, res) => {
  try {
    const owner = await Owner.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    res.json({
      name: owner.name,
      email: owner.email,
      phone: owner.phone,
      profileImage: owner.profileImage,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    // Mock data - replace with actual database queries
    const stats = {
      totalDoctors: 12,
      totalAppointments: 145,
      revenue: 25000,
      growth: 15,
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const owner = await Owner.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Fetch clinics first to get their IDs (exclude parent clinic)
    const PARENT_CLINIC_ID = '69a5a379e12ec0951afb560e';
    const clinics = await Clinic.find({ 
      _id: { $ne: PARENT_CLINIC_ID }
    });
    const clinicIds = clinics.map(c => c._id);

    const [managers, doctors, patients] = await Promise.all([
      Manager.find({}),
      Doctor.find({ clinicId: { $in: clinicIds } }),
      Patient.find({}),
    ]);

    const appointments = await Appointment.find({
      appointmentDate: { $gte: fromDate, $lte: toDate }
    });

    const periodDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
    const prevFromDate = new Date(fromDate);
    prevFromDate.setDate(prevFromDate.getDate() - periodDays);
    const prevToDate = new Date(fromDate);

    const prevAppointments = await Appointment.find({
      appointmentDate: { $gte: prevFromDate, $lt: prevToDate },
    });

    // Calculate changes (comparing counts, not filtered by creation date)
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return parseFloat((((current - previous) / previous) * 100).toFixed(1));
    };

    const prevRevenue = prevAppointments
      .filter(a => a.paid)
      .reduce((sum, a) => sum + (a.fee || 0), 0);

    const prevCareSyncRevenue = prevAppointments
      .filter(a => a.paid && a.careSyncFee)
      .reduce((sum, a) => sum + (a.careSyncFee || 0), 0);

    // Calculate average rating from clinics
    const clinicsWithRating = clinics.filter(c => c.ratingAvg && c.ratingAvg > 0);
    const avgClinicRating = clinicsWithRating.length > 0
      ? clinicsWithRating.reduce((sum, c) => sum + c.ratingAvg, 0) / clinicsWithRating.length
      : 0;

    // Calculate KPIs
    const totalRevenue = appointments
      .filter(a => a.paid)
      .reduce((sum, a) => sum + (a.fee || 0), 0);

    const careSyncRevenue = appointments
      .filter(a => a.paid && a.careSyncFee)
      .reduce((sum, a) => sum + (a.careSyncFee || 0), 0);

    const completedAppointments = appointments.filter(a => a.status === 'completed').length;
    const noShowAppointments = appointments.filter(a => a.status === 'no-show').length;
    const noShowRate = appointments.length > 0 ? (noShowAppointments / appointments.length) * 100 : 0;

    // Generate revenue timeline
    const revenueTimeline = [];
    const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(fromDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayRevenue = appointments
        .filter(a => {
          const aDate = new Date(a.appointmentDate).toISOString().split('T')[0];
          return aDate === dateStr && a.paid;
        })
        .reduce((sum, a) => sum + (a.fee || 0), 0);
      
      revenueTimeline.push({ date: dateStr, revenue: dayRevenue });
    }

    // Revenue by clinic (parent clinic already excluded)
    const revenueByClinic = clinics.map(clinic => {
      const clinicAppointments = appointments.filter(a => {
        const doctor = doctors.find(d => d._id.toString() === a.doctorId.toString());
        return doctor && doctor.clinicId.toString() === clinic._id.toString();
      });

      const clinicDoctors = doctors.filter(d => d.clinicId.toString() === clinic._id.toString());
      const manager = managers.find(m => m.clinicId && m.clinicId.toString() === clinic._id.toString());

      return {
        clinicId: clinic._id,
        clinicName: clinic.name,
        managerName: manager?.name || '',
        managerEmail: manager?.email || '',
        revenue: clinic.monthlyRevenue || 0,
        appointments: clinicAppointments.length,
        doctors: clinicDoctors.length,
        patients: 0,
        rating: clinic.ratingAvg || 0,
        isActive: clinic.isActive,
      };
    });

    // Revenue share
    const totalRevenueForShare = revenueByClinic.reduce((sum, c) => sum + c.revenue, 0);
    const revenueShare = revenueByClinic
      .filter(c => c.revenue > 0)
      .map(c => ({
        clinicId: c.clinicId,
        clinicName: c.clinicName,
        revenue: c.revenue,
        percentage: totalRevenueForShare > 0 ? Math.round((c.revenue / totalRevenueForShare) * 100) : 0,
      }));

    // Generate alerts
    const alerts = [];
    clinics.forEach(clinic => {
      const hasManager = managers.some(m => m.clinicId && m.clinicId.toString() === clinic._id.toString());
      if (!hasManager) {
        alerts.push({
          id: `no-manager-${clinic._id}`,
          type: 'no_manager',
          severity: 'high',
          message: {
            en: `${clinic.name.en} does not have an assigned manager`,
            ar: `${clinic.name.ar} ليس لديها مدير معين`
          },
          clinicId: clinic._id,
          cta: 'Assign Manager',
        });
      }
    });

    // Recent activity (mock for now)
    const recentActivity = [
      {
        id: '1',
        actorRole: 'Owner',
        actorName: owner.name,
        action: 'updated',
        entityType: 'clinic',
        entityName: clinics[0]?.name || 'Clinic',
        timestamp: new Date().toISOString(),
      },
    ];

    const dashboardData = {
      kpis: {
        totalClinics: clinics.length,
        totalManagers: managers.length,
        totalDoctors: doctors.length,
        totalPatients: patients.length,
        totalAppointments: appointments.length,
        totalRevenue,
        careSyncRevenue: parseFloat(careSyncRevenue.toFixed(2)),
        avgClinicRating: parseFloat(avgClinicRating.toFixed(1)),
        clinicsChange: 0,
        managersChange: 0,
        doctorsChange: 0,
        patientsChange: 0,
        appointmentsChange: calculateChange(appointments.length, prevAppointments.length),
        revenueChange: calculateChange(totalRevenue, prevRevenue),
        careSyncRevenueChange: calculateChange(careSyncRevenue, prevCareSyncRevenue),
      },
      revenueTimeline,
      revenueByClinic,
      revenueShare,
      alerts,
      recentActivity,
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getClinics = async (req, res) => {
  try {
    const owner = await Owner.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    const clinics = await Clinic.find({ isActive: true })
      .sort({ createdAt: -1 });

    const managers = await Manager.find({});
    const doctors = await Doctor.find({});
    const appointments = await Appointment.find({});
    
    const clinicsWithData = clinics.map(clinic => {
      const manager = managers.find(m => m.clinicId && m.clinicId.toString() === clinic._id.toString());
      const clinicDoctors = doctors.filter(d => d.clinicId && d.clinicId.toString() === clinic._id.toString());
      const clinicAppointments = appointments.filter(a => {
        const doctor = doctors.find(d => d._id.toString() === a.doctorId?.toString());
        return doctor && doctor.clinicId?.toString() === clinic._id.toString();
      });
      const uniquePatients = [...new Set(clinicAppointments.map(a => a.patientId?.toString()).filter(Boolean))];
      
      return {
        ...clinic.toObject(),
        manager: manager ? manager.name : null,
        managerId: manager ? manager._id : null,
        doctors: clinicDoctors.length,
        patients: uniquePatients.length,
        appointments: clinicAppointments.length,
      };
    });

    res.json(clinicsWithData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createClinic = async (req, res) => {
  try {
    const owner = await Owner.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    const clinicData = {
      ...req.body,
      createdBy: req.user.id,
    };

    const clinic = await Clinic.create(clinicData);

    res.status(201).json({
      message: 'Clinic created successfully',
      clinic,
    });
  } catch (error) {
    console.error('Create clinic error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getClinic = async (req, res) => {
  try {
    const owner = await Owner.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    const clinic = await Clinic.findById(req.params.id);

    if (!clinic) {
      return res.status(404).json({ message: 'Clinic not found' });
    }

    res.json(clinic);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateClinic = async (req, res) => {
  try {
    const owner = await Owner.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    const clinic = await Clinic.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!clinic) {
      return res.status(404).json({ message: 'Clinic not found' });
    }

    res.json({
      message: 'Clinic updated successfully',
      clinic,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({})
      .select('-auth.passwordHash')
      .sort({ createdAt: -1 });
    
    res.json(doctors);
  } catch (error) {
    console.error('getDoctors error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createDoctor = async (req, res) => {
  try {
    const owner = await Owner.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    const { clinicId } = req.body;
    if (!clinicId) {
      return res.status(400).json({ message: 'Clinic ID is required' });
    }

    const clinic = await Clinic.findById(clinicId);
    if (!clinic) {
      return res.status(404).json({ message: 'Clinic not found' });
    }

    const doctorData = {
      ...req.body,
      clinicId,
      createdBy: req.user.id,
    };

    const doctor = await Doctor.create(doctorData);

    res.status(201).json({
      message: 'Doctor created successfully',
      doctor,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Doctor with this email already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateDoctor = async (req, res) => {
  try {
    const owner = await Owner.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    const updateData = { ...req.body };
    
    // إذا تم إرسال كلمة مرور جديدة، نضعها في auth.passwordHash
    if (updateData.password && updateData.password.trim()) {
      updateData['auth.passwordHash'] = updateData.password;
      delete updateData.password;
    }

    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json({
      message: 'Doctor updated successfully',
      doctor,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteDoctor = async (req, res) => {
  try {
    const owner = await Owner.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    const doctor = await Doctor.findByIdAndDelete(req.params.id);

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email, password, phone, profileImage } = req.body;
    
    const owner = await Owner.findById(req.user.id);
    
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }
    
    // Update fields
    if (name) owner.name = name;
    if (email) owner.email = email;
    if (phone) owner.phone = phone;
    if (profileImage) owner.profileImage = profileImage;
    
    // Update password if provided
    if (password && password.trim()) {
      owner.passwordHash = password;
    }
    
    await owner.save();

    res.json({
      message: 'Profile updated successfully',
      owner: {
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        profileImage: owner.profileImage,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Manager Management
exports.getManagers = async (req, res) => {
  try {
    const owner = await Owner.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    const managers = await Manager.find({})
      .populate('clinicId', 'name')
      .sort({ createdAt: -1 });

    res.json(managers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getManager = async (req, res) => {
  try {
    const owner = await Owner.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    const manager = await Manager.findById(req.params.id).populate('clinicId', 'name');

    if (!manager) {
      return res.status(404).json({ message: 'Manager not found' });
    }

    res.json(manager);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.createManager = async (req, res) => {
  try {
    const owner = await Owner.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    const { name, email, phone, password, clinicId, permissions, isActive, nationalId, address } = req.body;

    // Validate clinic if provided
    if (clinicId) {
      const clinic = await Clinic.findById(clinicId);
      if (!clinic) {
        return res.status(404).json({ message: 'Clinic not found' });
      }
    }

    const managerData = {
      name,
      email,
      phone,
      passwordHash: password,
      clinicId: clinicId || undefined,
      permissions: permissions || {
        manageDoctors: true,
        manageAppointments: true,
        viewReports: true,
        managePricesServices: true,
        managePayments: true,
      },
      isActive: isActive !== undefined ? isActive : true,
      nationalId,
      address,
    };

    const manager = await Manager.create(managerData);

    res.status(201).json({
      message: 'Manager created successfully',
      manager,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Manager with this email already exists in this business' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateManager = async (req, res) => {
  try {
    const owner = await Owner.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    const { name, email, phone, clinicId, permissions, isActive, nationalId, address, password } = req.body;

    // Validate clinic if provided
    if (clinicId) {
      const clinic = await Clinic.findById(clinicId);
      if (!clinic) {
        return res.status(404).json({ message: 'Clinic not found' });
      }
    }

    const manager = await Manager.findById(req.params.id);
    if (!manager) {
      return res.status(404).json({ message: 'Manager not found' });
    }

    // Update fields
    if (name) manager.name = name;
    if (email) manager.email = email;
    if (phone) manager.phone = phone;
    if (clinicId !== undefined) manager.clinicId = clinicId || undefined;
    if (permissions) manager.permissions = permissions;
    if (isActive !== undefined) manager.isActive = isActive;
    if (nationalId) manager.nationalId = nationalId;
    if (address) manager.address = address;
    
    // Update password if provided (will be hashed by pre-save middleware)
    if (password && password.trim()) {
      manager.passwordHash = password;
    }

    await manager.save();
    await manager.populate('clinicId', 'name');

    res.json({
      message: 'Manager updated successfully',
      manager,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteManager = async (req, res) => {
  try {
    const owner = await Owner.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    const manager = await Manager.findByIdAndDelete(req.params.id);

    if (!manager) {
      return res.status(404).json({ message: 'Manager not found' });
    }

    res.json({ message: 'Manager deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getMainClinic = async (req, res) => {
  try {
    const MAIN_CLINIC_ID = '69a5a379e12ec0951afb560e';
    const clinic = await Clinic.findById(MAIN_CLINIC_ID);

    if (!clinic) {
      return res.status(404).json({ message: 'Main clinic not found' });
    }

    res.json(clinic);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateMainClinic = async (req, res) => {
  try {
    const MAIN_CLINIC_ID = '69a5a379e12ec0951afb560e';
    const clinic = await Clinic.findByIdAndUpdate(
      MAIN_CLINIC_ID,
      req.body,
      { new: true, runValidators: true }
    );

    if (!clinic) {
      return res.status(404).json({ message: 'Main clinic not found' });
    }

    res.json({
      message: 'Main clinic updated successfully',
      clinic,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getBusiness = async (req, res) => {
  try {
    const owner = await Owner.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    const Business = require('../models/Business');
    const business = await Business.findById(owner.businessId);

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    res.json(business);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateBusiness = async (req, res) => {
  try {
    const owner = await Owner.findById(req.user.id);
    if (!owner) {
      return res.status(404).json({ message: 'Owner not found' });
    }

    const Business = require('../models/Business');
    const business = await Business.findByIdAndUpdate(
      owner.businessId,
      req.body,
      { new: true, runValidators: true }
    );

    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    res.json({
      message: 'Business updated successfully',
      business,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
