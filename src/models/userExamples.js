/**
 * User Model Usage Examples
 * أمثلة عملية لاستخدام User model في Controllers
 */

const User = require('./User');
const { createBusinessQuery } = require('../middleware/multiTenant');

// ===== مثال 1: إنشاء مستخدم جديد =====
async function createUser(req, res) {
  try {
    const { name, email, password, role, phone } = req.body;
    const { businessId } = req; // من middleware

    const user = await User.create({
      businessId,
      name,
      email,
      passwordHash: password, // سيتم تشفيرها تلقائياً
      role,
      phone,
    });

    res.status(201).json({
      success: true,
      data: user, // passwordHash لن يظهر بسبب toJSON transform
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists in this business',
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
}

// ===== مثال 2: تسجيل الدخول =====
async function login(req, res) {
  try {
    const { email, password, businessId } = req.body;

    // البحث عن المستخدم مع passwordHash
    const user = await User.findByBusinessAndEmail(businessId, email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // التحقق من قفل الحساب
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is locked. Please try again later.',
      });
    }

    // التحقق من كلمة السر
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      await user.incrementLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // التحقق من حالة النشاط
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
      });
    }

    // إعادة تعيين المحاولات الفاشلة
    await user.resetLoginAttempts();

    // إصدار JWT tokens (مثال مبسط)
    // const accessToken = generateAccessToken(user);
    // const refreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        // accessToken,
        // refreshToken,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ===== مثال 3: الحصول على جميع المستخدمين في العيادة =====
async function getAllUsers(req, res) {
  try {
    const { businessId } = req;
    const { role, isActive } = req.query;

    // بناء الـ query
    const query = createBusinessQuery(businessId, {
      ...(role && { role }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
    });

    const users = await User.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ===== مثال 4: الحصول على الأطباء النشطين =====
async function getActiveDoctors(req, res) {
  try {
    const { businessId } = req;

    const doctors = await User.findByBusinessAndRole(businessId, 'doctor');

    res.json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ===== مثال 5: تحديث بيانات المستخدم =====
async function updateUser(req, res) {
  try {
    const { businessId } = req;
    const { userId } = req.params;
    const updates = req.body;

    // منع تحديث الحقول الحساسة مباشرة
    delete updates.passwordHash;
    delete updates.refreshTokenHash;
    delete updates.businessId;
    delete updates.role; // يجب أن يكون له endpoint منفصل

    const user = await User.findOneAndUpdate(
      { _id: userId, businessId },
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ===== مثال 6: تغيير كلمة السر =====
async function changePassword(req, res) {
  try {
    const { businessId, userId: currentUserId } = req.user; // من JWT
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    // التحقق من أن المستخدم يغير كلمة سره الخاصة
    // أو أنه owner/manager
    if (currentUserId !== userId && !['owner', 'manager'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You can only change your own password',
      });
    }

    const user = await User.findOne({ _id: userId, businessId }).select('+passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // التحقق من كلمة السر الحالية
    const isPasswordCorrect = await user.comparePassword(currentPassword);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // تحديث كلمة السر
    user.passwordHash = newPassword; // سيتم تشفيرها تلقائياً
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ===== مثال 7: تعطيل/تفعيل مستخدم =====
async function toggleUserStatus(req, res) {
  try {
    const { businessId } = req;
    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await User.findOneAndUpdate(
      { _id: userId, businessId },
      { isActive },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ===== مثال 8: حذف مستخدم (Soft Delete) =====
async function deleteUser(req, res) {
  try {
    const { businessId } = req;
    const { userId } = req.params;

    // Soft delete: تعطيل المستخدم بدلاً من حذفه
    const user = await User.findOneAndUpdate(
      { _id: userId, businessId },
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ===== مثال 9: إحصائيات المستخدمين =====
async function getUserStats(req, res) {
  try {
    const { businessId } = req;

    const stats = await User.aggregate([
      { $match: { businessId: mongoose.Types.ObjectId(businessId) } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: ['$isActive', 1, 0] },
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createUser,
  login,
  getAllUsers,
  getActiveDoctors,
  updateUser,
  changePassword,
  toggleUserStatus,
  deleteUser,
  getUserStats,
};
