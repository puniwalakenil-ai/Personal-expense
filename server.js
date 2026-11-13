import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint for Cloud Run container lifecycle
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Serve compiled static assets from dist
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback: return index.html for all non-file routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Application running on http://0.0.0.0:${PORT}`);
});
