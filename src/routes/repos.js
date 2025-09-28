import express from 'express';
import { getRepositories, createRepository } from '../controllers/repoController.js';

const router = express.Router();

router.get('/', getRepositories);
router.post('/', createRepository);

export default router;
