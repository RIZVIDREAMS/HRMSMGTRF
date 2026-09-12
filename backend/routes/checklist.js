const express = require('express');
const db = require('../db');
const { authenticate, requireAdminOrDirector } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ---------- Checklist item templates ----------
router.get('/items', (req, res) => {
  const { department = '', designation = '' } = req.query;
  let query = 'SELECT * FROM checklist_items WHERE is_active = 1';
  const params = [];
  if (department) { query += ' AND (department = ? OR department IS NULL)'; params.push(department); }
  if (designation) { query += ' AND (designation = ? OR designation IS NULL)'; params.push(designation); }
  res.json({ items: db.prepare(query + ' ORDER BY id').all(...params) });
});

// ---------- Full item list for the admin customization panel (includes inactive items) ----------
router.get('/items/all', requireAdminOrDirector, (req, res) => {
  const { department = '', designation = '' } = req.query;
  let query = 'SELECT * FROM checklist_items WHERE 1=1';
  const params = [];
  if (department) { query += ' AND (department = ? OR department IS NULL)'; params.push(department); }
  if (designation) { query += ' AND (designation = ? OR designation IS NULL)'; params.push(designation); }
  res.json({ items: db.prepare(query + ' ORDER BY is_active DESC, id DESC').all(...params) });
});

router.post('/items', requireAdminOrDirector, (req, res) => {
  const { title, department, designation, weight } = req.body;
  if (!title) return res.status(400).json({ error: 'title আবশ্যক' });
  const info = db.prepare('INSERT INTO checklist_items (title, department, designation, weight) VALUES (?, ?, ?, ?)')
    .run(title, department || null, designation || null, weight || 1);
  res.status(201).json({ item: db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(info.lastInsertRowid) });
});

router.delete('/items/:id', requireAdminOrDirector, (req, res) => {
  db.prepare('UPDATE checklist_items SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: 'চেকলিস্ট আইটেম নিষ্ক্রিয় করা হয়েছে' });
});

// ---------- Edit an item (title/department/designation/weight/is_active) — admin customization panel ----------
router.put('/items/:id', requireAdminOrDirector, (req, res) => {
  const existing = db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'আইটেম পাওয়া যায়নি' });

  const fields = ['title', 'department', 'designation', 'weight', 'is_active'];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(f === 'is_active' ? (req.body[f] ? 1 : 0) : (req.body[f] === '' ? null : req.body[f]));
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'আপডেট করার মতো কোনো তথ্য দেওয়া হয়নি' });
  params.push(req.params.id);

  db.prepare(`UPDATE checklist_items SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ item: db.prepare('SELECT * FROM checklist_items WHERE id = ?').get(req.params.id) });
});

// ---------- Submit responses for an employee on a date ----------
// body: { employee_id, date, responses: [{ checklist_item_id, answer: 'yes'|'no'|'partial', note }] }
router.post('/responses', (req, res) => {
  const { employee_id, date, responses } = req.body;
  if (!employee_id || !date || !Array.isArray(responses)) {
    return res.status(400).json({ error: 'employee_id, date, responses[] আবশ্যক' });
  }

  for (const r of responses) {
    if (!['yes', 'no', 'partial'].includes(r.answer)) {
      return res.status(400).json({ error: `অবৈধ উত্তর: ${r.answer}` });
    }
    if (r.answer === 'partial' && (!r.note || !r.note.trim())) {
      return res.status(400).json({ error: 'Partial উত্তরের জন্য নোট আবশ্যক (mandatory note required)' });
    }
  }

  const stmt = db.prepare(`
    INSERT INTO checklist_responses (employee_id, checklist_item_id, date, answer, note, submitted_by)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(employee_id, checklist_item_id, date) DO UPDATE SET
      answer = excluded.answer, note = excluded.note, submitted_by = excluded.submitted_by
  `);

  const insertMany = db.transaction((rows) => {
    for (const r of rows) stmt.run(employee_id, r.checklist_item_id, date, r.answer, r.note || null, req.user.id);
  });
  insertMany(responses);

  const saved = db.prepare(`
    SELECT cr.*, ci.title FROM checklist_responses cr
    JOIN checklist_items ci ON ci.id = cr.checklist_item_id
    WHERE cr.employee_id = ? AND cr.date = ?
  `).all(employee_id, date);

  res.status(201).json({ responses: saved });
});

// ---------- Get responses for an employee/date ----------
router.get('/responses/:employeeId/:date', (req, res) => {
  const rows = db.prepare(`
    SELECT cr.*, ci.title FROM checklist_responses cr
    JOIN checklist_items ci ON ci.id = cr.checklist_item_id
    WHERE cr.employee_id = ? AND cr.date = ?
  `).all(req.params.employeeId, req.params.date);
  res.json({ responses: rows });
});

module.exports = router;
