const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

// ✅ IMPORTANT: use system installed yt-dlp
const { create: createYoutubeDl } = require("youtube-dl-exec");
const ytdlp = createYoutubeDl("/usr/local/bin/yt-dlp");

const app = express();

// ✅ Render-friendly default port
const PORT = process.env.PORT || 8080;

// ✅ safer temp directory sa cloud (ephemeral)
const DOWNLOAD_DIR = "/tmp/downloads";

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// ✅ CORS FIX (allow Netlify + Localhost)
const ALLOWED_ORIGINS = [
  "https://youtube-downloader-by-rlb.netlify.app",
  "http://localhost:3000",
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (Postman/server-side)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS blocked: " + origin));
  },
  methods: ["GET", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.get("/", (req, res) => {
  res.send("✅ YouTube Downloader API is running.");
});

app.get("/download/:type", async (req, res) => {
  const { type } = req.params;
  const url = req.query.url;

  if (!url || !["mp3", "mp4"].includes(type)) {
    return res.status(400).send("❌ Invalid request.");
  }

  try {
    const extension = type === "mp3" ? "mp3" : "mp4";

    // ✅ Enable JS runtime (removes warning)
    const commonOptions = {
      noPlaylist: true,
      jsRuntimes: "node:/usr/local/bin/node",
      ffmpegLocation: "/usr/bin/ffmpeg",
    };

    const info = await ytdlp(url, {
      dumpSingleJson: true,
      ...commonOptions,
    });

    const rawTitle = (info?.title || "video").toString();
    const safeTitle =
      rawTitle.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "video";

    const filename = `${safeTitle}_${Date.now()}.${extension}`;
    const filepath = path.join(DOWNLOAD_DIR, filename);

    const options = {
      output: filepath,
      ...commonOptions,
    };

    if (type === "mp3") {
      options.extractAudio = true;
      options.audioFormat = "mp3";
      options.format = "bestaudio/best";
    } else {
      options.format = "best[ext=mp4]/best";
    }

    await ytdlp(url, options);

    // ✅ Send file then delete
    return res.download(filepath, filename, (err) => {
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

      if (err) {
        console.error("❌ res.download error:", err);
      }
    });
  } catch (err) {
    console.error("❌ Download error:", err);

    // ✅ clearer message if YouTube blocks cloud server
    const msg = String(err?.stderr || err?.message || err);

    if (msg.includes("Sign in to confirm you’re not a bot")) {
      return res
        .status(403)
        .send("❌ YouTube blocked this server (bot verification). Try another video.");
    }

    return res.status(500).send("❌ Failed to download.");
  }
});

// ✅ important for Docker/Render
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
