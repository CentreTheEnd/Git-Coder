import express from 'express';
import { authenticate, logout, validateSession } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', authenticate);
router.post('/logout', logout);
router.get('/validate', validateSession);

export default router;
