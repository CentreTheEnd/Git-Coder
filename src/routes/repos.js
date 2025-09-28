import express from 'express';
import { getRepositories, createRepository, getRepository } from '../controllers/repoController.js';

const router = express.Router();

router.get('/', getRepositories);
router.post('/', createRepository);
router.get('/info', getRepository);

export default router;
