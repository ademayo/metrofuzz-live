import express from 'express';
import { all } from '../db.js';

const router = express.Router();

router.get('/', (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    if (!q) return res.json([]);
    const like = `%${q}%`;

    const rows = all(`
        SELECT 'song'  AS type, id, title  AS value FROM songs   WHERE lower(title)  LIKE ?
        UNION
        SELECT 'artist', id, name           FROM artists WHERE lower(name)   LIKE ?
        UNION
        SELECT 'album', id, title           FROM albums  WHERE lower(title)  LIKE ?
        UNION
        SELECT 'genre', id, name            FROM genres  WHERE lower(name)   LIKE ?
        LIMIT 15
  `, [like, like, like, like]);

    res.json(rows);
});

export default router;