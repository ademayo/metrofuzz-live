import os, random, math, time
from collections import deque

MUSIC_DIR = "/media/music"
IDS_DIR = "/media/ids"
ADS_DIR = "/media/ads"
PLAYLIST_PATH = os.environ.get("PLAYLIST_PATH", "/media/music_playlist.m3u")
RECENT_ADS = 5

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
    music_deque = deque(weighted_music)

    # Load IDs & Ads
    ids = [os.path.join(IDS_DIR,f) for f in os.listdir(IDS_DIR) if f.lower().endswith(".mp3")]
    ads = [os.path.join(ADS_DIR,f) for f in os.listdir(ADS_DIR) if f.lower().endswith(".mp3")]
    final_playlist = []
    last_id = None
    recent_ads = deque(maxlen=RECENT_ADS)

    while music_deque:
        # 3 Music Tracks
        for _ in range(3):
            if not music_deque:
                break

            track = music_deque.popleft()
            final_playlist.append(track)
            music_deque.append(track)

        # 1 Random ID
        if ids:
            available_ids = [i for i in ids if i != last_id]

            if not available_ids:
                available_ids = ids

            chosen_id = random.choice(available_ids)
            final_playlist.append(chosen_id)
            last_id = chosen_id

        # Ad Block: 1-3 Ads
        if ads:
            num_ads = random.randint(1,3)
            available_ads = [a for a in ads if a not in recent_ads]

            if len(available_ads) < num_ads:
                available_ads = ads
                recent_ads.clear()

            ad_block = random.sample(available_ads, min(num_ads, len(available_ads)))
            final_playlist.extend(ad_block)
            recent_ads.extend(ad_block)

    # Write Playlist
    with open(PLAYLIST_PATH, "w") as f:
        for track in final_playlist:
            f.write(track + "\n")

    print(f"Playlist Generated With {len(final_playlist)} Tracks.")

# Run Twice A Day (~12 Hours)
while True:
    build_playlist()
    time.sleep(12*60*60)
