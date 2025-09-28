import express from 'express';
import { 
  getRepositoryContents, 
  getFile, 
  updateFile, 
  deleteFile, 
  runCode 
} from '../controllers/fileController.js';

const router = express.Router();

router.get('/contents', getRepositoryContents);
router.get('/file', getFile);
router.put('/file', updateFile);
router.delete('/file', deleteFile);
router.post('/run', runCode);

export default router;
