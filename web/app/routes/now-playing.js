import express from 'express';
import axios from 'axios';

const router = express.Router();
const ICECAST_STATUS_URL = `${process.env.ICECAST_URL || 'http://icecast:8000'}/status-json.xsl`;

router.get('/', async (_req, res) => {
    try {
        const { data } = await axios.get(ICECAST_STATUS_URL);
        const source = data.icestats?.source;
        if (!source) return res.json({ title: 'Stream Offline' });

        const stream = Array.isArray(source)
            ? (source.find(s => s.listenurl?.endsWith('stream.mp3')) || source[0])
            : source;

        res.json({ title: stream?.title || 'Unknown Track' });
    } catch {
        res.status(500).json({ title: 'Error Fetching Stream' });
    }
});

export default router;