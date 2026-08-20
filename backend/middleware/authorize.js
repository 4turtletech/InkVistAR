function authorize(...allowedRoles) {
  const roles = new Set(allowedRoles.flat());
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ success: false, message: 'Authentication required.' });
    if (roles.size > 0 && !roles.has(req.auth.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

module.exports = { authorize };
