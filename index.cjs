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

/* ===========================
   ✅ OPTIONAL COOKIES FIX
   (for "Sign in to confirm you're not a bot")
   Put YT_COOKIES_B64 sa Render env if needed
=========================== */
let COOKIE_FILE = null;

if (process.env.YT_COOKIES_B64) {
  const cookiePath = "/tmp/cookies.txt";
  fs.writeFileSync(cookiePath, Buffer.from(process.env.YT_COOKIES_B64, "base64"));
  COOKIE_FILE = cookiePath;
  console.log("✅ Cookies loaded!");
}

/* ===========================
   ✅ CORS FIX (Netlify + Local)
=========================== */
const allowedOrigins = [
  "https://youtube-downloader-by-rlb.netlify.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow curl/postman/mobile
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS: " + origin));
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

    // ✅ Get info (with cookies if available)
    const info = await ytdlp(url, {
      dumpSingleJson: true,
      noPlaylist: true,
      cookies: COOKIE_FILE || undefined,
    });

    const rawTitle = (info?.title || "video").toString();
    const safeTitle =
      rawTitle.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "video";

    const filename = `${safeTitle}_${Date.now()}.${extension}`;
    const filepath = path.join(DOWNLOAD_DIR, filename);

    const options = {
      output: filepath,
      noPlaylist: true,
      cookies: COOKIE_FILE || undefined,
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

    // ✅ return real error details (para makita mo sa frontend)
    return res.status(500).json({
      message: "❌ Failed to download.",
      details: err?.stderr || err?.message || String(err),
    });
  }
});

// ✅ important for Docker/Render
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
