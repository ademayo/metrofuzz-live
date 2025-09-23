set("log.stdout", true)
set("harbor.bind_addr", "0.0.0.0")

# Loudness Normalization (LUFS Approx)
normalize_audio(audio) = normalize(audio, gain_max=6.0)

# Load Randomized Stingers
start_stingers = list.hard("/media/effects/start")
end_stingers = list.hard("/media/effects/end")

def random_start_stinger() =
  random(list.map(single, start_stingers))

def random_end_stinger() =
  random(list.map(single, end_stingers))

# Station Identifiers (Hourly Breaks)
station_ids = playlist(mode="randomize", reload_mode="rounds", "/media/ids")

# Create Hourly Station Id Break With Stingers
station_id_block = sequence([random_start_stinger(), station_ids, random_end_stinger()])

# Schedule Station Id Break At The Top Of Every Hour
def schedule_station_ids() =
  add([blank(duration=delay_until_top_of_hour()), station_id_block])
end

# Helper To Calculate Time Until Top Of Hour
def delay_until_top_of_hour() =
  now = time()
  next_hour = ceil(now /. 3600.0) *. 3600.0
  next_hour -. now
end

# Ad Breaks (Every 30 Minutes)
ads = playlist(mode="rounds", reload_mode="rounds", "/media/ads")

# Scheduled Ad Block With Fair Rotation
def schedule_ads() =
  add([blank(duration=delay_until_next_half_hour()), sequence([ads, ads])])
end

# Helper To Calculate Time Until Next Half-Hour
def delay_until_next_half_hour() =
  now = time()
  next_half = ceil(now /. 1800.0) *. 1800.0
  next_half -. now
end

# Intros With Stingers (Paired To Songs)
def get_intros_for_song(basename) =
  all_intros = list.hard("/media/intros")

  intros_for_song = list.filter(
    fun(f) -> string.ends_with(f, "_" ^ basename ^ ".mp3"),
    all_intros
  )

  list.sort(intros_for_song)
end

# Pair Multiple Intros With Each Song, Include Stingers
def pair_multiple_intros_song(song_file) =
  basename = string.strip(string.split(filename_to_string(song_file), ".")[0])
  intros = get_intros_for_song(basename)
  intros_sources = list.map(single, intros)
  sequence([random_start_stinger()] @ intros_sources @ [random_end_stinger(), single(song_file)])
end

# Load And Pair Music With Intros
music_files = list.hard("/media/music")
paired_sources = list.map(pair_multiple_intros_song, music_files)

# Create Fair Rotation Of Paired Tracks
music_with_intros = rotate(weights=[], tracks=random(paired_sources))

# Buffers With Random Stingers
def buffer_with_stingers(file) =
  sequence([random_start_stinger(), single(file), random_end_stinger()])
end

buffer_files = list.hard("/media/buffers")
buffer_sources = list.map(buffer_with_stingers, buffer_files)
buffers = random(buffer_sources)

# Main Stream Logic
# Normalize Music With Intros
main_stream = normalize_audio(music_with_intros)

# Scheduled Events: Station Id + Ads + Main
events = fallback.track_sensitive([
  schedule_station_ids(),
  schedule_ads(),
  main_stream
])

# Request Queue (High Priority)
# Node App Uses `request.push "<path>"` Over Telnet To Enqueue Here
request_queue = request.queue(id="rq", timeout=3600., max=100)

# Final Fallback Chain: Requests > Events > Buffers
stream = fallback.track_sensitive([request_queue, events, buffers])

# Icecast Output Configuration
output.icecast(
  %mp3,
  host = "icecast",
  port = 8000,
  password = getenv("ICECAST_SOURCE_PASSWORD", default="changeme"),
  mount = "stream.mp3",
  name = "Metro Fuzz Radio",
  description = "Serving The Omaha Underground Since 2025",
  genre = "Independent Music / Community Radio",
  url = "https://metrofuzz.live",
  input = stream
)