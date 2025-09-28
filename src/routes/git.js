import express from 'express';
import { 
  getStatus,
  commitChanges,
  getHistory,
  createPullRequest,
  getPullRequests
} from '../controllers/gitController.js';

const router = express.Router();

router.get('/status', getStatus);
router.post('/commit', commitChanges);
router.get('/history', getHistory);
router.post('/pull-request', createPullRequest);
router.get('/pull-requests', getPullRequests);

export default router;
