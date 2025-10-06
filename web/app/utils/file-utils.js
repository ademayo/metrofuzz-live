import fs from 'fs';
import path from 'path';

export const walkDir = (directory) => {
    const out = [];

    try {
        for (const name of fs.readdirSync(directory)) {
            const file = path.join(directory, name);
            const stat = fs.statSync(file);
            stat.isDirectory() ? out.push(...walkDir(file)) : out.push(file);
        }
    } catch {}

    return out;
};

export const isAudioFile = (filePath) => [
    '.mp3',
    '.flac',
    '.ogg',
    '.m4a',
    '.aac',
    '.wav',
    '.opus'
].includes(path.extname(filePath).toLowerCase());

export const toTitleCase = (s) => {
    return s.replace(/\w\S*/g, w => {
        return w.charAt(0).toUpperCase() + w.substr(1).toLowerCase();
    });
}

export const humanizeTitle = (filename) => {
    return toTitleCase(filename.replace(/\.[^.]+$/, '').replace(/[._]+/g, ' ').trim());
}