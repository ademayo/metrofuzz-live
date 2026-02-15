def normalize_audio(input_audio) =
  normalize(input_audio, gain_max=6.0)
end

music_playlist = playlist(
  "/media/music_playlist.m3u",
  mode = "normal",
  reload_mode = "watch"
)

fallback_buffer = single("/media/buffers/buffer.mp3")

final_stream = fallback(track_sensitive = false, [
    music_playlist,
    fallback_buffer
])

normalized_stream = normalize_audio(final_stream)

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
  normalized_stream
)
