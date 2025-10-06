# FUNCTION To Normalize Audio Sources
def normalize_audio(input_audio) =
  normalize(input_audio, gain_max=6.0)
end

# DEFINE Playlists For Station Elements
ids = playlist("/media/ids", mode="random", reload_mode="lazy")
ads = playlist("/media/ads/*.mp3", mode="normal", reload_mode="lazy")
music = playlist("/media/daily.m3u", mode="normal", reload_mode="watch")

# CREATE Main Stream With Rotation Between IDs And Music
main_stream = fallback(track_sensitive=false, [
  rotate(weights = [1, 3], [ids, music])
])

# DEFINE Stream Switching Logic For Scheduled Ads
stream = switch([
  (predicate.activates({0m}), ads),
  (predicate.activates({15m}), ads),
  (predicate.activates({30m}), ads),
  (predicate.activates({45m}), ads),
  ({true}, main_stream)
])

# DEFINE Static Fallback Buffer Used If Stream Fails
fallback_buffer = single("/media/buffers/buffer.mp3")

# CREATE Final Stream With Fallback To Buffer If Needed
final_stream = fallback(track_sensitive=false, [
  stream,
  fallback_buffer
])

# NORMALIZE Output Stream (Note: Normalization Applied Only To Stream)
normalized_stream = normalize_audio(stream)

# OUTPUT Stream To Icecast Server
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
  final_stream
)