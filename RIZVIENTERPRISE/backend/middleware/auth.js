const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET is required in production');
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'dev-only-change-me';

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'অনুমোদন প্রয়োজন (No token provided)' });
  }

  try {
    const payload = jwt.verify(token, EFFECTIVE_JWT_SECRET);
    req.user = payload; // { id, employee_code, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'অকার্যকর বা মেয়াদোত্তীর্ণ টোকেন (Invalid or expired token)' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'এই কাজের জন্য পর্যাপ্ত অনুমতি নেই (Insufficient permissions)' });
    }
    next();
  };
}

const requireAdmin = requireRole('admin');
const requireAdminOrDirector = requireRole('admin', 'director');

module.exports = { authenticate, requireRole, requireAdmin, requireAdminOrDirector, JWT_SECRET: EFFECTIVE_JWT_SECRET };
