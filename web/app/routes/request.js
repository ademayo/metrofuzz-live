import express from 'express';
import { get, run } from '../db.js';
import { pushToLiquidsoap } from '../liquidsoap.js';
import { generatePlaylist } from '../playlist.js';
const router = express.Router();

router.post('/', (req, res) => {
    const { name, trackId } = req.body;

    if (!name || typeof trackId === 'undefined') {
        return res.status(400).json({
            message: 'Missing Name or Track ID'
        });
    }

    const song = get(`SELECT id, title, filepath FROM songs WHERE id = ?`, trackId);

    if (!song) {
        return res.status(404).json({ message: 'Track Not Found' });
    }

    run(`INSERT INTO requests(name, song_id, requested_at) VALUES(?,?,?)`, [
        name,
        song.id,
        new Date().toISOString()
    ]);

    pushToLiquidsoap(song.filepath)
        .then(() => {
            generatePlaylist();

            res.json({
                message: '🎶 Thanks! Your request was submitted.',
                title: song.title
            });
        }).catch(() => res.status(500).json({
            message: 'Server Error'
        }));
});

export default router;