import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

/*
import authRoutes from './src/routes/auth.js';
import repoRoutes from './src/routes/repos.js';
import fileRoutes from './src/routes/files.js';
*/

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src/public')));

/*
app.use('/api/auth', authRoutes);
app.use('/api/repos', repoRoutes);
app.use('/api/files', fileRoutes);
*/


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Git Editor server running on port ${PORT}`);
});

export default app;
