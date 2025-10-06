import { parseFile } from 'music-metadata';
import path from 'path';
import { walkDir, isAudioFile, humanizeTitle } from './utils/file-utils.js';
import { get, run } from './db.js';

const MUSIC_DIR = process.env.MUSIC_DIR || path.join(process.cwd(), 'music');
export const library = [];

export const scanLibrary = async () => {
    library.length = 0;
    const files = walkDir(MUSIC_DIR).filter(isAudioFile);

    for (const filepath of files) {
        try {
            const meta = await parseFile(filepath, { duration: true });

            const {
                common: { title, artist, album, genre = [], year, track, disk },
                format: { duration }
            } = meta;

            const artistName = artist || 'Unknown Artist';
            const titleName  = title  || humanizeTitle(path.basename(filepath));
            const albumTitle = album  || 'Unknown Album';
            let artistId = get(`SELECT id FROM artists WHERE name = ?`, artistName)?.id;
            if (!artistId) artistId = run(`INSERT INTO artists(name) VALUES(?)`, artistName);

            let albumId = get(
                `SELECT id FROM albums WHERE title = ? AND artist_id = ?`,
                [albumTitle, artistId]
            )?.id;

            if (!albumId) albumId = run(
                `INSERT INTO albums(title, artist_id, year) VALUES(?,?,?)`,
                [albumTitle, artistId, year || null]
            );

            let songId = get(`SELECT id FROM songs WHERE filepath = ?`, filepath)?.id;

            if (!songId) {
                songId = run(`
                    INSERT INTO songs(
                        title, 
                        filepath, 
                        track, 
                        disc, 
                        duration,
                        artist_id, 
                        album_id, 
                        year
                    )
                    VALUES(?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    titleName,
                    filepath,
                    track?.no || null,
                    disk?.no || null,
                    duration,
                    artistId,
                    albumId,
                    year || null
                ]);
            }

            for (const g of genre) {
                const gClean = g.trim();
                let genreId = get(`SELECT id FROM genres WHERE name = ?`, gClean)?.id;
                if (!genreId) genreId = run(`INSERT INTO genres(name) VALUES(?)`, gClean);

                run(`INSERT OR IGNORE INTO song_genres(song_id, genre_id) VALUES(?,?)`, [
                    songId,
                    genreId
                ]);
            }

            library.push({
                id: songId,
                title: `${artistName} - ${titleName}`, filepath
            });
        } catch (error) {}
    }
};