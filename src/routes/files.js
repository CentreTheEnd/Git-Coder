import express from 'express';
import { 
  getRepositoryContents, 
  getFile, 
  updateFile, 
  createFile, 
  deleteFile, 
  runCode,
  searchInRepo
} from '../controllers/fileController.js';

const router = express.Router();

router.get('/contents', getRepositoryContents);
router.get('/file', getFile);
router.put('/file', updateFile);
router.post('/file', createFile);
router.delete('/file', deleteFile);
router.post('/run', runCode);
router.get('/search', searchInRepo);

export default router;
