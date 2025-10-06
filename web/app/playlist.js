import cron from 'node-cron';
import fs   from 'fs';
import { all } from './db.js';
import { scanLibrary } from './library.js';

const PLAYLIST_M3U = process.env.PLAYLIST_OUTPUT || '../../media/daily.m3u';

export const generatePlaylist = () => {
    const reqRows  = all(`
      SELECT songs.filepath
      FROM requests
      JOIN  songs ON songs.id = requests.song_id
      WHERE fulfilled = 0
      ORDER BY requests.requested_at ASC
  `);

  const songRows = all(`SELECT filepath FROM songs ORDER BY RANDOM()`);
  const list     = [...reqRows, ...songRows].map(r => r.filepath);

  fs.writeFileSync(PLAYLIST_M3U, list.join('\n'), 'utf8');
};

/* --------------------------------------------------------------------- *
 *  CRON – run every day at 03:00 server time                            *
 * --------------------------------------------------------------------- */
cron.schedule('0 3 * * *', async () => {
    console.log('[cron] nightly rescan & playlist rebuild');
    await scanLibrary();
    generatePlaylist();
});

generatePlaylist();