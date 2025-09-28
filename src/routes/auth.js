import express from 'express';
import { authenticate, logout } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', authenticate);
router.post('/logout', logout);

export default router;
