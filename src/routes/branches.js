import express from 'express';
import { 
  getBranches, 
  createBranch, 
  switchBranch
} from '../controllers/branchController.js';

const router = express.Router();

router.get('/', getBranches);
router.post('/', createBranch);
router.post('/switch', switchBranch);

export default router;
