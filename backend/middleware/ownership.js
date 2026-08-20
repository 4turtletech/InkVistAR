function requireOwnership({ getOwnerId, allowRoles = ['admin'] }) {
  const privilegedRoles = new Set(allowRoles);
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ success: false, message: 'Authentication required.' });
    if (privilegedRoles.has(req.auth.role)) return next();

    const ownerId = Number(getOwnerId(req));
    if (!Number.isInteger(ownerId) || ownerId !== Number(req.auth.userId)) {
      return res.status(403).json({ success: false, message: 'You may only access your own resources.' });
    }
    next();
  };
}

module.exports = { requireOwnership };
