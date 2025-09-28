import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import compression from 'compression';
import cors from 'cors';

import authRoutes from './src/routes/auth.js';
import repoRoutes from './src/routes/repos.js';
import fileRoutes from './src/routes/files.js';
import branchRoutes from './src/routes/branches.js';
import gitRoutes from './src/routes/git.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'src/public')));


io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});


app.use('/api/auth', authRoutes);
app.use('/api/repos', repoRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/git', gitRoutes);


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/public/index.html'));
});


app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Git Coder',
    version: '1.0.0',
    timestamp: new Date().toISOString() 
  });
});


app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});


app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`Git Coder server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to view the app`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { io };

export default app;
