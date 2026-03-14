const TransferRequest = require('../models/TransferRequest');
const Doctor = require('../models/Doctor');
const Manager = require('../models/Manager');
const Clinic = require('../models/Clinic');

// Manager: إرسال طلب نقل دكتور
exports.sendTransferRequest = async (req, res) => {
  try {
    const { doctorId, message } = req.body;
    const managerId = req.user.id;

    const manager = await Manager.findById(managerId);
    if (!manager) {
      return res.status(404).json({ message: 'Manager not found' });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const transferRequest = await TransferRequest.create({
      doctorId,
      fromClinicId: doctor.clinicId,
      toClinicId: manager.clinicId,
      managerId,
      message,
      status: 'pending',
    });

    await transferRequest.populate([
      { path: 'doctorId', select: 'firstName lastName name email specialty' },
      { path: 'toClinicId', select: 'name' },
      { path: 'managerId', select: 'name email' },
    ]);

    res.status(201).json({
      success: true,
      data: transferRequest,
    });
  } catch (error) {
    console.error('Error sending transfer request:', error);
    res.status(500).json({ message: 'Failed to send transfer request' });
  }
};

// Manager: الحصول على جميع الطلبات المرسلة
exports.getManagerRequests = async (req, res) => {
  try {
    const managerId = req.user.id;

    const requests = await TransferRequest.find({ managerId })
      .populate('doctorId', 'firstName lastName name email specialty')
      .populate('toClinicId', 'name')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('Error fetching manager requests:', error);
    res.status(500).json({ message: 'Failed to fetch requests' });
  }
};

// Doctor: الحصول على جميع الطلبات الواردة
exports.getDoctorRequests = async (req, res) => {
  try {
    const doctorId = req.user.id;

    const requests = await TransferRequest.find({ doctorId })
      .populate('managerId', 'name email phone')
      .populate('toClinicId', 'name address phone')
      .populate('fromClinicId', 'name')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('Error fetching doctor requests:', error);
    res.status(500).json({ message: 'Failed to fetch requests' });
  }
};

// Doctor: الرد على طلب النقل
exports.respondToTransferRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, doctorResponse } = req.body;
    const doctorId = req.user.id;

    const request = await TransferRequest.findOne({
      _id: requestId,
      doctorId,
      status: 'pending',
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found or already processed' });
    }

    request.status = status;
    request.doctorResponse = doctorResponse;
    request.respondedAt = new Date();
    await request.save();

    // إذا وافق الدكتور، نقوم بتحديث clinicId
    if (status === 'accepted') {
      await Doctor.findByIdAndUpdate(doctorId, {
        clinicId: request.toClinicId,
      });
    }

    await request.populate([
      { path: 'managerId', select: 'name email' },
      { path: 'toClinicId', select: 'name' },
    ]);

    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error('Error responding to transfer request:', error);
    res.status(500).json({ message: 'Failed to respond to request' });
  }
};

// Doctor: إرسال رسالة للمدير
exports.sendMessageToManager = async (req, res) => {
  try {
    const { requestId, message } = req.body;
    const doctorId = req.user.id;

    const request = await TransferRequest.findOne({
      _id: requestId,
      doctorId,
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    request.doctorResponse = message;
    await request.save();

    await request.populate([
      { path: 'managerId', select: 'name email' },
      { path: 'doctorId', select: 'firstName lastName name email' },
    ]);

    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

// Manager: الرد على رسالة الدكتور
exports.replyToDoctor = async (req, res) => {
  try {
    const { requestId, message } = req.body;
    const managerId = req.user.id;

    const request = await TransferRequest.findOne({
      _id: requestId,
      managerId,
    });

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    request.managerResponse = message;
    await request.save();

    await request.populate([
      { path: 'doctorId', select: 'firstName lastName name email' },
      { path: 'managerId', select: 'name email' },
    ]);

    res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error) {
    console.error('Error replying to doctor:', error);
    res.status(500).json({ message: 'Failed to send reply' });
  }
};
