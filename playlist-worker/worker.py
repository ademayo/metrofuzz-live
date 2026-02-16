import os
import random
import math
import time
from collections import defaultdict

MUSIC_DIR = "/media/music"
IDS_DIR = "/media/ids"
ADS_DIR = "/media/ads"
PLAYLIST_PATH = "music_playlist.m3u"
AVG_TRACK_LENGTH = 210

def get_next_ad_interval():
    return random.randint(18 * 60, 25 * 60)

def build_playlist():
    print("Scanning Music Library...")

    # ---- Scan All Tracks ----
    band_tracks = defaultdict(list)

    for band in os.listdir(MUSIC_DIR):
        band_path = os.path.join(MUSIC_DIR, band)

        if not os.path.isdir(band_path):
            continue

        for root, _, files in os.walk(band_path):
            for f in files:
                if f.lower().endswith(".mp3"):
                    full_path = os.path.join(root, f)
                    band_tracks[band].append(full_path)

    # Remove Empty Bands
    band_tracks = {
        band: tracks
        for band, tracks in band_tracks.items()
        if tracks
    }

    if not band_tracks:
        print("No Music Tracks Found!")
        return

    # ---- Fair Weighting (Square Root Bias) ----
    band_weights = {
        band: math.sqrt(len(tracks))
        for band, tracks in band_tracks.items()
    }

    max_weight = max(band_weights.values())

    band_weights = {
        band: max(1, int(100 * w / max_weight))
        for band, w in band_weights.items()
    }

    # ---- Build Weighted Track Pool ----
    weighted_tracks = []

    for band, tracks in band_tracks.items():
        weight = band_weights[band]

        for track in tracks:
            weighted_tracks.extend([track] * weight)

    random.shuffle(weighted_tracks)

    # ---- Load IDs And Ads ----
    ids = []

    if os.path.isdir(IDS_DIR):
        ids = [
            os.path.join(IDS_DIR, f)
            for f in os.listdir(IDS_DIR)
            if f.lower().endswith(".mp3")
        ]
    ads = []

    if os.path.isdir(ADS_DIR):
        ads = [
            os.path.join(ADS_DIR, f)
            for f in os.listdir(ADS_DIR)
            if f.lower().endswith(".mp3")
        ]

    final_playlist = []
    last_band = None
    last_id = None
    last_ads = set()
    seconds_since_ad = 0
    next_ad_time = get_next_ad_interval()
    target_tracks = 12 * 60 * 60 // AVG_TRACK_LENGTH
    music_played = 0
    track_index = 0

    # ---- Build Playlist ----
    while music_played < target_tracks and track_index < len(weighted_tracks):
        # --- Music Block (3 Songs) ---
        block_count = 0

        while block_count < 3 and music_played < target_tracks and track_index < len(weighted_tracks):
            track = weighted_tracks[track_index]
            track_index += 1
            band = os.path.basename(os.path.dirname(track))

            # Prevent Immediate Same-Band Repeat
            if band == last_band:
                continue

            final_playlist.append(track)
            last_band = band
            block_count += 1
            music_played += 1
            seconds_since_ad += AVG_TRACK_LENGTH

        if block_count == 0:
            break  # No More Playable Tracks

        # --- Station ID After Music Block ---
        if ids:
            available_ids = [i for i in ids if i != last_id]

            if not available_ids:
                available_ids = ids

            chosen_id = random.choice(available_ids)
            final_playlist.append(chosen_id)
            last_id = chosen_id

        # --- Ad Break Based On Time ---
        if ads and seconds_since_ad >= next_ad_time:
            num_ads = random.randint(1, 3)
            available_ads = [a for a in ads if a not in last_ads]

            if len(available_ads) < num_ads:
                available_ads = ads
                last_ads.clear()

            ad_block = random.sample(
                available_ads,
                min(num_ads, len(available_ads))
            )

            for ad in ad_block:
                final_playlist.append(ad)

            last_ads.update(ad_block)
            seconds_since_ad = 0
            next_ad_time = get_next_ad_interval()

    # ---- Write Playlist File ----
    print("Writing Playlist:", PLAYLIST_PATH)
    print("Total Items:", len(final_playlist))

    with open(PLAYLIST_PATH, "w") as f:
        for item in final_playlist:
            f.write(item + "\n")

    print("Playlist Generated Successfully.")

# ---- Loop Forever With 12-Hour Sleep ----
while True:
    try:
        print("\n--- Building New Playlist ---")
        # build_playlist()
        print("Sleeping 12 Hours...\n")
        time.sleep(12 * 60 * 60)
    except Exception as exception:
        print("Error Occurred:", exception)
        print("Retrying In 60 Seconds...")
        time.sleep(60)
