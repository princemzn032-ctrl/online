import express from 'express';
import { listLeaderboard } from './platformRoutes.js';

const router = express.Router();

router.get('/', listLeaderboard);
router.get('/branches/:branchId', (req, res) => {
  req.query.branchId = req.params.branchId;
  return listLeaderboard(req, res);
});

export default router;
