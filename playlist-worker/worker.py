import os, random, math, time

MUSIC_DIR = "/media/music"
IDS_DIR = "/media/ids"
ADS_DIR = "/media/ads"
PLAYLIST_PATH = os.environ.get("PLAYLIST_PATH", "/media/music_playlist.m3u")

def build_playlist():
    bands = [d for d in os.listdir(MUSIC_DIR) if os.path.isdir(os.path.join(MUSIC_DIR,d))]
    tracks_with_weights = []

    # Scan Bands
    for band in bands:
        band_path = os.path.join(MUSIC_DIR, band)
        band_tracks = []

        for root, _, files in os.walk(band_path):
            for f in files:
                if f.lower().endswith(".mp3"):
                    band_tracks.append(os.path.join(root,f))

        n_tracks = len(band_tracks)
        if n_tracks == 0: continue

        # Smooth Weighting: sqrt(1 / n_tracks)
        weight = math.sqrt(1 / n_tracks)

        for t in band_tracks:
            tracks_with_weights.append((t, weight))

    if not tracks_with_weights:
        print("No music tracks found!")
        return

    # Normalize Weights To Integers
    max_weight = max(w for _,w in tracks_with_weights)
    weighted_music = []

    for path, w in tracks_with_weights:
        w_int = max(1, int(100 * w / max_weight))
        weighted_music.extend([path]*w_int)

    random.shuffle(weighted_music)

    # Load IDs & Ads
    ids = [os.path.join(IDS_DIR,f) for f in os.listdir(IDS_DIR) if f.lower().endswith(".mp3")]
    ads = [os.path.join(ADS_DIR,f) for f in os.listdir(ADS_DIR) if f.lower().endswith(".mp3")]

    # Build Final Playlist
    final_playlist = []
    i = 0

    while i < len(weighted_music):
        # 3 Music Tracks
        final_playlist.extend(weighted_music[i:i+3])
        i += 3

        # 1 Random ID
        if ids:
            final_playlist.append(random.choice(ids))

        if ads and random.random() < 0.35:
            final_playlist.append(random.choice(ads))

    # Write Playlist
    with open(PLAYLIST_PATH, "w") as f:
        for track in final_playlist:
            f.write(track + "\n")

    print(f"Playlist Generated With {len(final_playlist)} Tracks.")

# Run Twice A Day (~12 Hours)
while True:
    build_playlist()
    time.sleep(12 * 60 * 60)
