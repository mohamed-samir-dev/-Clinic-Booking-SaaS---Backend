/**
 * RBAC Usage Examples in Routes
 * أمثلة عملية لاستخدام نظام الصلاحيات في الـ Routes
 */

const express = require('express');
const router = express.Router();

// Middleware
const { authenticate } = require('../middleware/auth'); // JWT verification
const { validateBusinessAccess } = require('../middleware/multiTenant');
const { authorize, restrictTo, checkOwnership, PERMISSIONS } = require('../middleware/rbac');

// Controllers
const userController = require('../controllers/userController');

// ===== تطبيق Middleware على جميع الـ routes =====
router.use(authenticate); // التحقق من JWT
router.use(validateBusinessAccess); // التحقق من businessId

// ===== مثال 1: استخدام authorize مع صلاحية واحدة =====
// فقط من لديه صلاحية USERS_CREATE يمكنه إنشاء مستخدم
router.post(
  '/users',
  authorize(PERMISSIONS.USERS_CREATE),
  userController.createUser
);

// ===== مثال 2: استخدام restrictTo مع أدوار محددة =====
// فقط Owner و Manager يمكنهم حذف المستخدمين
router.delete(
  '/users/:userId',
  restrictTo('owner', 'manager'),
  userController.deleteUser
);

// ===== مثال 3: استخدام authorize مع صلاحيات متعددة =====
// يجب توفر جميع الصلاحيات (requireAll = true)
router.put(
  '/users/:userId/role',
  authorize([PERMISSIONS.USERS_UPDATE, PERMISSIONS.USERS_MANAGE_ROLES], true),
  userController.updateUserRole
);

// ===== مثال 4: استخدام checkOwnership =====
// المستخدم يمكنه تحديث بياناته الخاصة، أو Owner/Manager يمكنهم تحديث أي مستخدم
router.put(
  '/users/:userId',
  checkOwnership('userId'),
  userController.updateUser
);

// ===== مثال 5: دمج authorize مع checkOwnership =====
// يجب أن يكون لديه صلاحية + يكون المالك للمورد
router.put(
  '/users/:userId/password',
  authorize(PERMISSIONS.USERS_UPDATE),
  checkOwnership('userId'),
  userController.changePassword
);

// ===== مثال 6: صلاحيات متعددة مع OR logic =====
// يكفي توفر إحدى الصلاحيات (requireAll = false)
router.get(
  '/reports',
  authorize([PERMISSIONS.REPORTS_VIEW, PERMISSIONS.ANALYTICS_VIEW], false),
  userController.getReports
);

// ===== مثال 7: routes عامة (بدون صلاحيات خاصة) =====
// جميع المستخدمين المصادق عليهم يمكنهم قراءة بيانات العيادة
router.get('/business', userController.getBusinessInfo);

// ===== مثال 8: routes حسب الدور للأطباء =====
// الطبيب يمكنه رؤية مواعيده فقط
router.get(
  '/doctors/:doctorId/appointments',
  restrictTo('doctor', 'manager', 'owner'),
  checkOwnership('doctorId'),
  userController.getDoctorAppointments
);

// ===== مثال 9: Owner فقط =====
// فقط Owner يمكنه تحديث إعدادات العيادة
router.put(
  '/business/settings',
  restrictTo('owner'),
  userController.updateBusinessSettings
);

// ===== مثال 10: صلاحيات مخصصة في Controller =====
router.get('/users', userController.getAllUsers);
// في الـ controller:
/*
async function getAllUsers(req, res) {
  const { role } = req.user;
  
  // Owner و Manager يمكنهم رؤية جميع المستخدمين
  if (['owner', 'manager'].includes(role)) {
    const users = await User.find({ businessId: req.businessId });
    return res.json({ success: true, data: users });
  }
  
  // الأدوار الأخرى يمكنهم رؤية بياناتهم فقط
  const user = await User.findById(req.user.userId);
  return res.json({ success: true, data: user });
}
*/

module.exports = router;

// ===== ملخص الاستخدام =====
/*

1. authenticate: التحقق من JWT token (يجب أن يكون أول middleware)
2. validateBusinessAccess: التحقق من businessId (ثاني middleware)
3. authorize(permissions): التحقق من الصلاحيات
4. restrictTo(roles): التحقق من الأدوار
5. checkOwnership(field): التحقق من ملكية المورد

الترتيب الصحيح:
router.METHOD(
  '/path',
  authenticate,           // 1. التحقق من JWT
  validateBusinessAccess, // 2. التحقق من businessId
  authorize(PERMISSION),  // 3. التحقق من الصلاحية
  checkOwnership(),       // 4. التحقق من الملكية (اختياري)
  controller.method       // 5. Controller
);

*/
