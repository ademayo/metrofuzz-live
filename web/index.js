import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import net from 'net';

const app = express();
const port = 3000;

const ICECAST_STATUS_URL = `${process.env.ICECAST_URL || 'http://icecast:8000'}/status-json.xsl`;
const REQUESTS_FILE = path.join(process.cwd(), 'requests.txt');
const LIQ_TELNET_HOST = process.env.LIQ_TELNET_HOST || '127.0.0.1';
const LIQ_TELNET_PORT = parseInt(process.env.LIQ_TELNET_PORT || '1234', 10);
const LIQ_TELNET_PASSWORD = process.env.LIQ_TELNET_PASSWORD || '';
const MUSIC_DIR = process.env.MUSIC_DIR || path.join(process.cwd(), 'music');
const PLAYLIST_FILE = process.env.PLAYLIST_FILE || '';

let library = [];

app.use(express.static('public'));
app.use(express.json());

app.get('/api/now-playing', async (req, res) => {
    try {
        const { data } = await axios.get(ICECAST_STATUS_URL);
        const source = data.icestats?.source;

        if (!source) return res.json({ title: 'Stream Offline' });

        let title = 'Unknown Track';

        if (Array.isArray(source)) {
            const streamSource = source.find(s => s.listenurl?.endsWith('stream.mp3')) || source[0];
            title = streamSource?.title || title;
        } else {
            title = source.title || title;
        }

        res.json({ title });
    } catch {
        res.status(500).json({ title: 'Error Fetching Stream' });
    }
});

app.get('/api/search', (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();

    if (!q) return res.json([]);

    const results = library
        .filter(item => item.title.toLowerCase().includes(q))
        .slice(0, 10)
        .map(({ id, title }) => ({ id, title }));

    res.json(results);
});

app.post('/api/request', async (req, res) => {
    const { name, track, trackId } = req.body;

    if (!name || (!track && typeof trackId === 'undefined')) {
        return res.status(400).json({ message: 'Missing Name Or Track Info.' });
    }

    let chosen = typeof trackId !== 'undefined' ? library.find(it => it.id === trackId) : null;

    if (!chosen && track) {
        const q = String(track).trim().toLowerCase();
        chosen = library.find(it => it.title.toLowerCase().includes(q));
    }

    if (!chosen) return res.status(404).json({ message: 'Track Not Found In Library.' });

    try {
        await pushToLiquidsoap(chosen.filepath);
        await fs.promises.appendFile(REQUESTS_FILE, `[${new Date().toISOString()}] ${name}: ${chosen.title}\n`);
        res.json({ message: '🎶 Thanks! Your Request Was Submitted.', title: chosen.title });
    } catch {
        res.status(500).json({ message: 'Server Error Submitting Request.' });
    }
});

app.listen(port);

const loadLibrary = () => {
    try {
        if (PLAYLIST_FILE) {
            const m3uPath = path.resolve(PLAYLIST_FILE);
            const content = fs.readFileSync(m3uPath, 'utf8');

            const files = content
                .split(/\r?\n/)
                .filter(l => l && !l.startsWith('#'))
                .map(l => (path.isAbsolute(l) ? l : path.resolve(path.dirname(m3uPath), l)))
                .filter(f => isAudioFile(f) && fs.existsSync(f));

            library = files.map((filepath, idx) => ({
                id: idx,
                title: humanizeTitle(path.basename(filepath)),
                filepath
            }));

            return;
        }

        const files = walkDir(MUSIC_DIR).filter(isAudioFile);

        library = files.map((filepath, idx) => ({
            id: idx,
            title: humanizeTitle(path.basename(filepath)),
            filepath
        }));

    } catch {
        library = [];
    }
};

const walkDir = dir => {
    const out = [];

    try {
        for (const name of fs.readdirSync(dir)) {
            const fp = path.join(dir, name);
            const stat = fs.statSync(fp);
            stat.isDirectory() ? out.push(...walkDir(fp)) : out.push(fp);
        }
    } catch {}

    return out;
};

const isAudioFile = fp => ['.mp3', '.flac', '.ogg', '.m4a', '.aac', '.wav', '.opus'].includes(path.extname(fp).toLowerCase());

const humanizeTitle = filename => toTitleCase(filename.replace(/\.[^.]+$/, '').replace(/[._]+/g, ' ').trim());

const toTitleCase = s => s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

const pushToLiquidsoap = filepath =>
    new Promise((resolve, reject) => {
        const client = new net.Socket();
        let settled = false;
        let buffer = '';

        const done = error => {
            if (!settled) {
                settled = true;
                try { client.destroy(); } catch {}
                error ? reject(error) : resolve();
            }
        };

        client.setTimeout(5000);

        client.on('data', chunk => {
            buffer += chunk.toString();
            if (buffer.match(/(Welcome|> )/i)) {
                const commands = [];
                if (LIQ_TELNET_PASSWORD) commands.push(`authenticate ${LIQ_TELNET_PASSWORD}`);
                commands.push(`request.push "${filepath.replace(/(["\\])/g, '\\$1')}"`);
                commands.push('quit');
                client.write(commands.join('\n') + '\n');
            }
            if (buffer.match(/(OK|Added|queued)/i)) done();
        });

        client.on('timeout', () => done(new Error('Liquidsoap Telnet Timeout')));
        client.on('error', done);
        client.on('close', done);
        client.connect(LIQ_TELNET_PORT, LIQ_TELNET_HOST);
    });

loadLibrary();