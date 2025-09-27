##############################
# Helper Functions
##############################

def normalize_audio(input_audio) =
  normalize(input_audio, gain_max=6.0)
end

def delay_until_top_of_hour() =
  now = time()
  next_hour = ((now / 3600.0) + 1.0) * 3600.0
  next_hour - now
end

def delay_until_next_half_hour() =
  now = time()
  next_half = ((now / 1800.0) + 1.0) * 1800.0
  next_half - now
end

def get_basename(path_str) =
  path.remove_extension(path.basename(path_str))
end

##############################
# Stingers (Preloaded Once)
##############################

start_stingers_paths = file.ls("/media/effects/start", pattern="*.mp3", absolute=true, sorted=true)
start_stingers = list.map(single, start_stingers_paths)

end_stingers_paths = file.ls("/media/effects/end", pattern="*.mp3", absolute=true, sorted=true)
end_stingers = list.map(single, end_stingers_paths)

# Reusable random start and end stinger sources (reused, not recreated)
random_start_stinger = random(start_stingers)
random_end_stinger = random(end_stingers)

##############################
# Station IDs (Hourly)
##############################

station_id_paths = file.ls("/media/ids", pattern="*.mp3", absolute=true, sorted=true)
station_id_sources = list.map(single, station_id_paths)
random_station_id = random(station_id_sources)

station_id_block = sequence([random_start_stinger, random_station_id, random_end_stinger])

def schedule_station_ids() =
  sequence([
    blank(duration=delay_until_top_of_hour()),
    station_id_block
  ])
end

##############################
# Ads (Every 30 Minutes)
##############################

ads = playlist(mode="rounds", reload_mode="rounds", "/media/ads")

def schedule_ads() =
  sequence([
    blank(duration=delay_until_next_half_hour()),
    ads,
    ads
  ])
end

##############################
# Music (Plain, No Intros)
##############################

music_paths = file.ls("/media/music", pattern="*.mp3", absolute=true, sorted=true)
music_sources = list.map(single, music_paths)
random_music = random(music_sources)

music_with_stingers = sequence([random_start_stinger, random_music, random_end_stinger])

##############################
# Buffers
##############################

buffer_paths = file.ls("/media/buffers", pattern="*.mp3", absolute=true, sorted=true)
buffer_sources = list.map(single, buffer_paths)
random_buffer = random(buffer_sources)

buffers = sequence([random_start_stinger, random_buffer, random_end_stinger])

##############################
# Main Stream Logic
##############################

main_stream = normalize_audio(music_with_stingers)

events = fallback([schedule_station_ids(), schedule_ads(), main_stream], track_sensitive=true)

##############################
# Requests (High Priority)
##############################

request_queue = request.queue(id="rq", timeout=3600.)

##############################
# Final Fallback Chain
##############################

stream = fallback([request_queue.source(), events, buffers], track_sensitive=true)

##############################
# Icecast Output
##############################

output.icecast(
  %mp3,
  host = "icecast",
  port = 8000,
  password = environment.get("ICECAST_SOURCE_PASSWORD"),
  mount = "stream.mp3",
  name = "Metro Fuzz Radio",
  description = "Serving The Omaha Underground Since 2025",
  genre = "Independent Music / Community Radio",
  url = "https://metrofuzz.live",
  stream
)
