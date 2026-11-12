import express from 'express';
import { adminOnly, protect } from '../middleware/authMiddleware.js';
import Branch from '../models/Branch.js';
import Semester from '../models/Semester.js';
import Subject from '../models/Subject.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const branches = await Branch.find({ isActive: true }).sort({ name: 1 }).lean();
    const semesters = await Semester.find({ branchId: { $in: branches.map((branch) => branch._id) } })
      .sort({ number: 1 })
      .lean();
    const subjects = await Subject.find({ isActive: true, branchId: { $in: branches.map((branch) => branch._id) } })
      .select('branchId semesterId')
      .lean();
    return res.json(branches.map((branch) => ({
      id: String(branch._id),
      name: branch.name,
      code: branch.code,
      description: branch.description,
      semesters: semesters
        .filter((semester) => String(semester.branchId) === String(branch._id))
        .map((semester) => ({
          id: String(semester._id),
          number: semester.number,
          name: semester.name,
          subjectCount: subjects.filter((subject) => String(subject.semesterId) === String(semester._id)).length,
        })),
    })));
  } catch (error) {
    console.error('Branch list failed:', error.message);
    return res.status(500).json({ message: 'Unable to load engineering branches.' });
  }
});

router.get('/:branchId/semesters', async (req, res) => {
  try {
    const semesters = await Semester.find({ branchId: req.params.branchId }).sort({ number: 1 }).lean();
    return res.json(semesters.map((semester) => ({
      id: String(semester._id),
      branchId: String(semester.branchId),
      number: semester.number,
      name: semester.name,
    })));
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid branch identifier.' });
    console.error('Semester list failed:', error.message);
    return res.status(500).json({ message: 'Unable to load semesters.' });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  const { name, code, description } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ message: 'Branch name and code are required.' });
  }
  try {
    const branch = await Branch.create({ name: name.trim(), code: code.trim().toUpperCase(), description });
    return res.status(201).json(branch);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A branch with that name or code already exists.' });
    console.error('Branch creation failed:', error.message);
    return res.status(400).json({ message: 'Unable to create branch.' });
  }
});

router.put('/:branchId', protect, adminOnly, async (req, res) => {
  const updates = {};
  ['name', 'code', 'description', 'isActive'].forEach((field) => {
    if (req.body?.[field] !== undefined) updates[field] = req.body[field];
  });
  if (typeof updates.name === 'string') updates.name = updates.name.trim();
  if (typeof updates.code === 'string') updates.code = updates.code.trim().toUpperCase();
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.branchId, updates, { new: true, runValidators: true });
    if (!branch) return res.status(404).json({ message: 'Branch not found.' });
    return res.json(branch);
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid branch identifier.' });
    if (error.code === 11000) return res.status(409).json({ message: 'A branch with that name or code already exists.' });
    console.error('Branch update failed:', error.message);
    return res.status(400).json({ message: 'Unable to update branch.' });
  }
});

router.delete('/:branchId', protect, adminOnly, async (req, res) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.branchId, { isActive: false }, { new: true });
    if (!branch) return res.status(404).json({ message: 'Branch not found.' });
    return res.status(204).end();
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid branch identifier.' });
    console.error('Branch deactivation failed:', error.message);
    return res.status(500).json({ message: 'Unable to deactivate branch.' });
  }
});

export default router;
