import express from 'express';
import { adminOnly, protect } from '../middleware/authMiddleware.js';
import Subject from '../models/Subject.js';
import Topic from '../models/Topic.js';

const router = express.Router();

router.post('/', protect, adminOnly, async (req, res) => {
  const { subjectId, name, description, order } = req.body || {};
  if (!subjectId || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'Subject and topic name are required.' });
  }
  try {
    if (!await Subject.exists({ _id: subjectId, isActive: true })) {
      return res.status(404).json({ message: 'Active subject not found.' });
    }
    const topic = await Topic.create({
      subjectId,
      name: name.trim(),
      description: typeof description === 'string' ? description.trim() : '',
      order: Number.isInteger(order) && order >= 0 ? order : 0,
    });
    return res.status(201).json(topic);
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid subject identifier.' });
    if (error.code === 11000) return res.status(409).json({ message: 'That topic already exists for this subject.' });
    console.error('Topic creation failed:', error.message);
    return res.status(400).json({ message: 'Unable to create topic.' });
  }
});

router.put('/:topicId', protect, adminOnly, async (req, res) => {
  const updates = {};
  ['name', 'description', 'order'].forEach((field) => {
    if (req.body?.[field] !== undefined) updates[field] = req.body[field];
  });
  if (typeof updates.name === 'string') updates.name = updates.name.trim();
  try {
    const topic = await Topic.findByIdAndUpdate(req.params.topicId, updates, { new: true, runValidators: true });
    if (!topic) return res.status(404).json({ message: 'Topic not found.' });
    return res.json(topic);
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid topic identifier.' });
    if (error.code === 11000) return res.status(409).json({ message: 'That topic already exists for this subject.' });
    console.error('Topic update failed:', error.message);
    return res.status(400).json({ message: 'Unable to update topic.' });
  }
});

router.delete('/:topicId', protect, adminOnly, async (req, res) => {
  try {
    const topic = await Topic.findByIdAndDelete(req.params.topicId);
    if (!topic) return res.status(404).json({ message: 'Topic not found.' });
    return res.status(204).end();
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid topic identifier.' });
    console.error('Topic deletion failed:', error.message);
    return res.status(500).json({ message: 'Unable to delete topic.' });
  }
});

export default router;
