import express from 'express';
import { adminOnly, protect } from '../middleware/authMiddleware.js';
import Branch from '../models/Branch.js';
import Semester from '../models/Semester.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.branchId) filter.branchId = req.query.branchId;
  try {
    const semesters = await Semester.find(filter).sort({ number: 1 }).lean();
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
  const { branchId, number } = req.body || {};
  if (!branchId || !Number.isInteger(number) || number < 1 || number > 8) {
    return res.status(400).json({ message: 'A valid branch and semester number (1-8) are required.' });
  }
  try {
    const branch = await Branch.findById(branchId);
    if (!branch || !branch.isActive) return res.status(404).json({ message: 'Active branch not found.' });
    const semester = await Semester.create({ branchId, number, name: `Semester ${number}` });
    return res.status(201).json(semester);
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid branch identifier.' });
    if (error.code === 11000) return res.status(409).json({ message: 'That semester already exists for this branch.' });
    console.error('Semester creation failed:', error.message);
    return res.status(400).json({ message: 'Unable to create semester.' });
  }
});

router.put('/:semesterId', protect, adminOnly, async (req, res) => {
  const updates = {};
  if (typeof req.body?.name === 'string') updates.name = req.body.name.trim();
  if (req.body?.number !== undefined) updates.number = req.body.number;
  try {
    const semester = await Semester.findByIdAndUpdate(req.params.semesterId, updates, { new: true, runValidators: true });
    if (!semester) return res.status(404).json({ message: 'Semester not found.' });
    return res.json(semester);
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid semester identifier.' });
    if (error.code === 11000) return res.status(409).json({ message: 'That semester already exists for this branch.' });
    console.error('Semester update failed:', error.message);
    return res.status(400).json({ message: 'Unable to update semester.' });
  }
});

router.delete('/:semesterId', protect, adminOnly, async (req, res) => {
  try {
    const semester = await Semester.findByIdAndDelete(req.params.semesterId);
    if (!semester) return res.status(404).json({ message: 'Semester not found.' });
    return res.status(204).end();
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid semester identifier.' });
    console.error('Semester deletion failed:', error.message);
    return res.status(500).json({ message: 'Unable to delete semester.' });
  }
});

export default router;
