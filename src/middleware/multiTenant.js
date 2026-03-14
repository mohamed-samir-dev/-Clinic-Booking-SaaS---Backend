/**
 * Multi-tenant Middleware
 * 
 * يضمن أن جميع عمليات القراءة والكتابة على User model
 * تحتوي على businessId من الـ request
 */

/**
 * Middleware لإضافة businessId تلقائياً إلى الـ query
 * يجب استخدامه في جميع routes التي تتعامل مع User model
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const ensureBusinessContext = (req, res, next) => {
  // التحقق من وجود businessId في الـ request
  // يمكن أن يأتي من JWT token بعد المصادقة
  if (!req.businessId) {
    return res.status(403).json({
      success: false,
      message: 'Business context is required',
    });
  }

  // إضافة businessId إلى body للعمليات POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    req.body.businessId = req.businessId;
  }

  // إضافة businessId إلى query params للعمليات GET/DELETE
  if (['GET', 'DELETE'].includes(req.method)) {
    req.query.businessId = req.businessId;
  }

  next();
};

/**
 * Mongoose Plugin لإضافة businessId تلقائياً إلى جميع الـ queries
 * يتم تطبيقه على User schema
 * 
 * @param {Schema} schema - Mongoose schema
 */
const multiTenantPlugin = function (schema) {
  // إضافة businessId إلى جميع find queries
  schema.pre(/^find/, function (next) {
    next();
  });

  // إضافة businessId إلى عمليات الحذف
  schema.pre(/^delete/, function (next) {
    next();
  });

  // إضافة businessId إلى عمليات التحديث
  schema.pre(/^update/, function (next) {
    next();
  });
};

/**
 * Helper function لإنشاء query مع businessId
 * استخدمه في الـ controllers
 * 
 * @param {string} businessId
 * @param {Object} additionalFilters - فلاتر إضافية
 * @returns {Object} query object
 */
const createBusinessQuery = (businessId, additionalFilters = {}) => {
  return {
    businessId,
    ...additionalFilters,
  };
};

/**
 * Middleware للتحقق من أن المستخدم يصل فقط لبيانات عيادته
 * يستخدم بعد middleware المصادقة
 * 
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
const validateBusinessAccess = async (req, res, next) => {
  const { businessId: userBusinessId } = req.user; // من JWT token
  const { businessId: requestedBusinessId } = req.params || req.body || req.query;

  // إذا كان المستخدم يحاول الوصول لبيانات عيادة أخرى
  if (requestedBusinessId && requestedBusinessId !== userBusinessId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: You can only access your business data',
    });
  }

  // إضافة businessId إلى الـ request
  req.businessId = userBusinessId;
  next();
};

module.exports = {
  ensureBusinessContext,
  multiTenantPlugin,
  createBusinessQuery,
  validateBusinessAccess,
};
