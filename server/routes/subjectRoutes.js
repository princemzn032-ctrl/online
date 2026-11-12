import express from 'express';
import { adminOnly, protect } from '../middleware/authMiddleware.js';
import Semester from '../models/Semester.js';
import Subject from '../models/Subject.js';
import Topic from '../models/Topic.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const filter = { isActive: true };
  if (req.query.branchId) filter.branchId = req.query.branchId;
  if (req.query.semesterId) filter.semesterId = req.query.semesterId;
  try {
    const subjects = await Subject.find(filter)
      .populate('semesterId', 'number name')
      .sort({ name: 1 })
      .lean();
    return res.json(subjects.map((subject) => ({
      id: String(subject._id),
      branchId: String(subject.branchId),
      semester: subject.semesterId?.number,
      semesterId: String(subject.semesterId?._id || ''),
      name: subject.name,
      code: subject.code,
      description: subject.description,
      isCommon: subject.isCommon,
    })));
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid branch or semester identifier.' });
    console.error('Subject list failed:', error.message);
    return res.status(500).json({ message: 'Unable to load subjects.' });
  }
});

router.get('/:subjectId/topics', async (req, res) => {
  try {
    const topics = await Topic.find({ subjectId: req.params.subjectId }).sort({ order: 1, name: 1 }).lean();
    return res.json(topics.map((topic) => ({
      id: String(topic._id),
      subjectId: String(topic.subjectId),
      name: topic.name,
      description: topic.description,
      order: topic.order,
    })));
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid subject identifier.' });
    console.error('Topic list failed:', error.message);
    return res.status(500).json({ message: 'Unable to load topics.' });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  const { branchId, semesterId, name, code, description, isCommon } = req.body || {};
  if (!branchId || !semesterId || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'Branch, semester and subject name are required.' });
  }
  try {
    const semester = await Semester.findOne({ _id: semesterId, branchId });
    if (!semester) return res.status(400).json({ message: 'The semester does not belong to the selected branch.' });
    const subject = await Subject.create({
      branchId,
      semesterId,
      name: name.trim(),
      code: typeof code === 'string' ? code.trim() : '',
      description: typeof description === 'string' ? description.trim() : '',
      isCommon: Boolean(isCommon),
    });
    return res.status(201).json(subject);
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid branch or semester identifier.' });
    if (error.code === 11000) return res.status(409).json({ message: 'That subject already exists in this semester.' });
    console.error('Subject creation failed:', error.message);
    return res.status(400).json({ message: 'Unable to create subject.' });
  }
});

router.put('/:subjectId', protect, adminOnly, async (req, res) => {
  const updates = {};
  ['name', 'code', 'description', 'isCommon', 'isActive'].forEach((field) => {
    if (req.body?.[field] !== undefined) updates[field] = req.body[field];
  });
  if (typeof updates.name === 'string') updates.name = updates.name.trim();
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.subjectId, updates, { new: true, runValidators: true });
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });
    return res.json(subject);
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid subject identifier.' });
    if (error.code === 11000) return res.status(409).json({ message: 'That subject already exists in this semester.' });
    console.error('Subject update failed:', error.message);
    return res.status(400).json({ message: 'Unable to update subject.' });
  }
});

router.delete('/:subjectId', protect, adminOnly, async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.subjectId, { isActive: false }, { new: true });
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });
    return res.status(204).end();
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid subject identifier.' });
    console.error('Subject deactivation failed:', error.message);
    return res.status(500).json({ message: 'Unable to deactivate subject.' });
  }
});

export default router;
