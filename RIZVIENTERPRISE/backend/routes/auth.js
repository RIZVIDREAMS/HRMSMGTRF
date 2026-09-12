const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// ---------- Login ----------
// Login with employee_code + password (works for admin, director, and employee accounts)
router.post('/login', (req, res) => {
  const { employee_code, password } = req.body;

  if (!employee_code || !password) {
    return res.status(400).json({ error: 'employee_code এবং password আবশ্যক' });
  }

  const user = db.prepare('SELECT * FROM users WHERE employee_code = ?').get(employee_code.trim());

  if (!user || !user.is_active) {
    return res.status(401).json({ error: 'ভুল আইডি অথবা পাসওয়ার্ড' });
  }

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) {
    return res.status(401).json({ error: 'ভুল আইডি অথবা পাসওয়ার্ড' });
  }

  db.prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?').run(user.id);

  const employee = db.prepare('SELECT * FROM employees WHERE employee_code = ?').get(user.employee_code);

  const token = jwt.sign(
    { id: user.id, employee_code: user.employee_code, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      employee_code: user.employee_code,
      name: user.name,
      role: user.role,
      must_change_password: !!user.must_change_password,
    },
    employee: employee || null,
  });
});

// ---------- Current logged-in user ----------
router.get('/me', authenticate, (req, res) => {
  const user = db
    .prepare('SELECT id, employee_code, name, role, must_change_password, last_login_at FROM users WHERE id = ?')
    .get(req.user.id);

  if (!user) return res.status(404).json({ error: 'User not found' });

  const employee = db.prepare('SELECT * FROM employees WHERE employee_code = ?').get(user.employee_code);
  res.json({ user, employee: employee || null });
});

// ---------- Change password ----------
router.post('/change-password', authenticate, (req, res) => {
  const { current_password, new_password } = req.body;

  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Skip current-password check only on forced first-login change
  if (!user.must_change_password) {
    if (!current_password || !bcrypt.compareSync(current_password, user.password)) {
      return res.status(401).json({ error: 'বর্তমান পাসওয়ার্ড ভুল' });
    }
  }

  const hashed = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?').run(hashed, user.id);

  res.json({ message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে' });
});

module.exports = router;
