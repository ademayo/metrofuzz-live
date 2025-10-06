import path from 'path';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'library.db');
export const db = new Database(DB_PATH, { verbose: false });

db.exec(`
  PRAGMA journal_mode = WAL;
  
  CREATE TABLE IF NOT EXISTS artists (
    id INTEGER PRIMARY KEY, 
    name TEXT UNIQUE
  );
  
  CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY, 
    title TEXT, 
    artist_id INTEGER, 
    year INTEGER,
    UNIQUE(title, artist_id)
  );
  
  CREATE TABLE IF NOT EXISTS genres (
    id INTEGER PRIMARY KEY, 
    name TEXT UNIQUE
  );
  
  CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY, 
    title TEXT, 
    filepath TEXT UNIQUE,
    track INTEGER, 
    disc INTEGER, 
    duration REAL,
    artist_id INTEGER, 
    album_id INTEGER, 
    year INTEGER
  );
                                       
  CREATE TABLE IF NOT EXISTS song_genres (
    song_id INTEGER, 
    genre_id INTEGER,
    PRIMARY KEY(song_id, genre_id)
  );
                                          
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY, 
    name TEXT, 
    song_id INTEGER,
    requested_at TEXT,
    fulfilled INTEGER DEFAULT 0
  );
`);

export const get = (sql, params) => db.prepare(sql).get(params);
export const all = (sql, params) => db.prepare(sql).all(params);
export const run = (sql, params) => db.prepare(sql).run(params).lastInsertRowid;
export const exec = sql => db.exec(sql);