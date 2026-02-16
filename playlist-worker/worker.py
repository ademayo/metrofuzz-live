import os, random, math, time
from collections import deque, defaultdict

MUSIC_DIR = "/media/music"
IDS_DIR = "/media/ids"
ADS_DIR = "/media/ads"
PLAYLIST_PATH = os.environ.get("PLAYLIST_PATH", "/media/music_playlist.m3u")
AVG_TRACK_LENGTH = 210

def get_next_ad_interval():
    return random.randint(18*60, 25*60)

def build_playlist():
    bands = [d for d in os.listdir(MUSIC_DIR)
             if os.path.isdir(os.path.join(MUSIC_DIR, d))]

    band_tracks = {}

    # Scan Bands
    for band in bands:
        band_path = os.path.join(MUSIC_DIR, band)
        tracks = []

        for root, _, files in os.walk(band_path):
            for f in files:
                if f.lower().endswith(".mp3"):
                    tracks.append(os.path.join(root, f))

        if tracks:
            random.shuffle(tracks)
            band_tracks[band] = deque(tracks)

    if not band_tracks:
        print("No Music Tracks Found!")
        return

    # Fair Weighting: Square Root Bias But Not Extreme
    band_weights = {
        band: math.sqrt(len(tracks))
        for band, tracks in band_tracks.items()
    }

    # Normalize Weights
    max_weight = max(band_weights.values())
    band_weights = {
        band: int(100 * w / max_weight)
        for band, w in band_weights.items()
    }

    # Expand Band Rotation Pool
    rotation_pool = []
    for band, weight in band_weights.items():
        rotation_pool.extend([band] * max(1, weight))

    random.shuffle(rotation_pool)

    # Load IDs & Ads
    ids = [os.path.join(IDS_DIR, f)
           for f in os.listdir(IDS_DIR)
           if f.lower().endswith(".mp3")]

    ads = [os.path.join(ADS_DIR, f)
           for f in os.listdir(ADS_DIR)
           if f.lower().endswith(".mp3")]

    final_playlist = []
    last_band = None
    last_id = None
    last_ads_played = set()
    seconds_since_ad = 0
    next_ad_time = get_next_ad_interval()

    # Build Playlist Length Target (About 12 Hours)
    target_tracks = 12 * 60 * 60 // AVG_TRACK_LENGTH
    music_count = 0

    while music_count < target_tracks:
        # --- MUSIC BLOCK (3 songs) ---
        block_count = 0

        while block_count < 3 and music_count < target_tracks:
            random.shuffle(rotation_pool)

            for band in rotation_pool:
                if band != last_band and band_tracks[band]:
                    track = band_tracks[band].popleft()
                    final_playlist.append(track)
                    last_band = band
                    block_count += 1
                    music_count += 1
                    seconds_since_ad += AVG_TRACK_LENGTH
                    break

        # --- ID After Music Block ---
        if ids:
            available_ids = [i for i in ids if i != last_id]
            if not available_ids:
                available_ids = ids

            chosen_id = random.choice(available_ids)
            final_playlist.append(chosen_id)
            last_id = chosen_id

        # --- AD BREAK ---
        if ads and seconds_since_ad >= next_ad_time:
            num_ads = random.randint(1, 3)
            available_ads = [a for a in ads if a not in last_ads_played]

            if len(available_ads) < num_ads:
                available_ads = ads
                last_ads_played.clear()

            ad_block = random.sample(available_ads,
                                     min(num_ads, len(available_ads)))

            for ad in ad_block:
                final_playlist.append(ad)

            last_ads_played.update(ad_block)

            seconds_since_ad = 0
            next_ad_time = get_next_ad_interval()

    # Write Playlist
    with open(PLAYLIST_PATH, "w") as f:
        for track in final_playlist:
            f.write(track + "\n")

    print(f"Playlist Generated With {len(final_playlist)} Items.")


# Run Twice A Day (~12 Hours)
while True:
    build_playlist()
    time.sleep(12 * 60 * 60)