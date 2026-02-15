import express from 'express';
import axios from 'axios';

const app = express();
const port = 3000;
const ICECAST_STATUS_URL = `${process.env.ICECAST_URL || 'http://icecast:8000'}/status-json.xsl`;

app.use(express.json());

app.get('/api/now-playing', async (request, response) => {
    try {
        const { data } = await axios.get(ICECAST_STATUS_URL);
        const source = data.icestats?.source;

        if (!source) {
            return response.json({
                title: 'Stream Offline'
            });
        }

        let title = 'Unknown Track';

        if (Array.isArray(source)) {
            const streamSource = source.find(s => s.listenurl?.endsWith('stream.mp3')) || source[0];
            title = streamSource?.title || title;
        } else {
            title = source.title || title;
        }

        response.json({
            title
        });
    } catch {
        response.status(500).json({
            title: 'Error Fetching Stream'
        });
    }
});

app.listen(port);