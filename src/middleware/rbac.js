/**
 * RBAC (Role-Based Access Control) Configuration
 * نظام التحكم في الصلاحيات حسب الدور
 */

// تعريف الصلاحيات المتاحة في النظام
const PERMISSIONS = {
  // ===== إدارة المستخدمين =====
  USERS_CREATE: 'users:create',
  USERS_READ: 'users:read',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_MANAGE_ROLES: 'users:manage_roles',

  // ===== إدارة الأطباء =====
  DOCTORS_CREATE: 'doctors:create',
  DOCTORS_READ: 'doctors:read',
  DOCTORS_UPDATE: 'doctors:update',
  DOCTORS_DELETE: 'doctors:delete',

  // ===== إدارة المواعيد =====
  APPOINTMENTS_CREATE: 'appointments:create',
  APPOINTMENTS_READ: 'appointments:read',
  APPOINTMENTS_UPDATE: 'appointments:update',
  APPOINTMENTS_DELETE: 'appointments:delete',
  APPOINTMENTS_MANAGE_ALL: 'appointments:manage_all',

  // ===== إدارة المرضى =====
  PATIENTS_CREATE: 'patients:create',
  PATIENTS_READ: 'patients:read',
  PATIENTS_UPDATE: 'patients:update',
  PATIENTS_DELETE: 'patients:delete',

  // ===== إدارة العيادة =====
  BUSINESS_READ: 'business:read',
  BUSINESS_UPDATE: 'business:update',
  BUSINESS_DELETE: 'business:delete',
  BUSINESS_SETTINGS: 'business:settings',

  // ===== التقارير والإحصائيات =====
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  ANALYTICS_VIEW: 'analytics:view',

  // ===== المالية =====
  BILLING_READ: 'billing:read',
  BILLING_CREATE: 'billing:create',
  BILLING_UPDATE: 'billing:update',
};

// تعريف الصلاحيات لكل دور
const ROLE_PERMISSIONS = {
  owner: [
    // المالك لديه جميع الصلاحيات
    ...Object.values(PERMISSIONS),
  ],

  manager: [
    // إدارة المستخدمين (ما عدا تغيير الأدوار)
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DELETE,

    // إدارة الأطباء
    PERMISSIONS.DOCTORS_CREATE,
    PERMISSIONS.DOCTORS_READ,
    PERMISSIONS.DOCTORS_UPDATE,
    PERMISSIONS.DOCTORS_DELETE,

    // إدارة المواعيد
    PERMISSIONS.APPOINTMENTS_CREATE,
    PERMISSIONS.APPOINTMENTS_READ,
    PERMISSIONS.APPOINTMENTS_UPDATE,
    PERMISSIONS.APPOINTMENTS_DELETE,
    PERMISSIONS.APPOINTMENTS_MANAGE_ALL,

    // إدارة المرضى
    PERMISSIONS.PATIENTS_CREATE,
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_UPDATE,
    PERMISSIONS.PATIENTS_DELETE,

    // قراءة بيانات العيادة
    PERMISSIONS.BUSINESS_READ,

    // التقارير
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.ANALYTICS_VIEW,

    // المالية
    PERMISSIONS.BILLING_READ,
    PERMISSIONS.BILLING_CREATE,
    PERMISSIONS.BILLING_UPDATE,
  ],

  doctor: [
    // قراءة المستخدمين
    PERMISSIONS.USERS_READ,

    // قراءة الأطباء
    PERMISSIONS.DOCTORS_READ,

    // إدارة المواعيد الخاصة به
    PERMISSIONS.APPOINTMENTS_READ,
    PERMISSIONS.APPOINTMENTS_UPDATE,

    // إدارة المرضى
    PERMISSIONS.PATIENTS_CREATE,
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_UPDATE,

    // قراءة بيانات العيادة
    PERMISSIONS.BUSINESS_READ,

    // عرض التقارير الخاصة به
    PERMISSIONS.REPORTS_VIEW,
  ],

  staff: [
    // قراءة المستخدمين
    PERMISSIONS.USERS_READ,

    // قراءة الأطباء
    PERMISSIONS.DOCTORS_READ,

    // إدارة المواعيد
    PERMISSIONS.APPOINTMENTS_CREATE,
    PERMISSIONS.APPOINTMENTS_READ,
    PERMISSIONS.APPOINTMENTS_UPDATE,

    // إدارة المرضى
    PERMISSIONS.PATIENTS_CREATE,
    PERMISSIONS.PATIENTS_READ,
    PERMISSIONS.PATIENTS_UPDATE,

    // قراءة بيانات العيادة
    PERMISSIONS.BUSINESS_READ,
  ],
};

/**
 * التحقق من صلاحية المستخدم
 * @param {string} role - دور المستخدم
 * @param {string} permission - الصلاحية المطلوبة
 * @returns {boolean}
 */
function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * التحقق من صلاحيات متعددة
 * @param {string} role - دور المستخدم
 * @param {string[]} requiredPermissions - الصلاحيات المطلوبة
 * @param {boolean} requireAll - هل يجب توفر جميع الصلاحيات؟
 * @returns {boolean}
 */
function hasPermissions(role, requiredPermissions, requireAll = true) {
  if (requireAll) {
    return requiredPermissions.every((permission) =>
      hasPermission(role, permission)
    );
  }
  return requiredPermissions.some((permission) =>
    hasPermission(role, permission)
  );
}

/**
 * Middleware للتحقق من الصلاحية
 * @param {string|string[]} requiredPermissions - الصلاحية أو الصلاحيات المطلوبة
 * @param {boolean} requireAll - هل يجب توفر جميع الصلاحيات؟
 */
function authorize(requiredPermissions, requireAll = true) {
  return (req, res, next) => {
    const { role } = req.user; // من JWT token

    if (!role) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: No role assigned',
      });
    }

    const permissions = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];

    const hasAccess = hasPermissions(role, permissions, requireAll);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Insufficient permissions',
      });
    }

    next();
  };
}

/**
 * Middleware للتحقق من الدور مباشرة
 * @param {string|string[]} allowedRoles - الأدوار المسموح بها
 */
function restrictTo(...allowedRoles) {
  return (req, res, next) => {
    const { role } = req.user;

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to perform this action',
      });
    }

    next();
  };
}

/**
 * التحقق من ملكية المورد
 * يسمح للمستخدم بالوصول لبياناته الخاصة فقط
 * @param {string} userIdField - اسم الحقل الذي يحتوي على userId
 */
function checkOwnership(userIdField = 'userId') {
  return async (req, res, next) => {
    const { userId, role } = req.user;
    const resourceUserId = req.params[userIdField] || req.body[userIdField];

    // Owner و Manager يمكنهم الوصول لجميع الموارد
    if (['owner', 'manager'].includes(role)) {
      return next();
    }

    // المستخدمون الآخرون يمكنهم الوصول لبياناتهم فقط
    if (resourceUserId !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only access your own resources',
      });
    }

    next();
  };
}

/**
 * الحصول على جميع صلاحيات دور معين
 * @param {string} role
 * @returns {string[]}
 */
function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasPermissions,
  authorize,
  restrictTo,
  checkOwnership,
  getRolePermissions,
};
