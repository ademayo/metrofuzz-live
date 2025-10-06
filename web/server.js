import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanLibrary } from './app/library.js';
import './app/playlist.js';
import nowPlayingRoute from './app/routes/now-playing.js';
import searchRoute     from './app/routes/search.js';
import requestRoute    from './app/routes/request.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.use('/api/now-playing', nowPlayingRoute);
app.use('/api/search', searchRoute);
app.use('/api/request', requestRoute);

app.listen(port);
await scanLibrary();