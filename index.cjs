const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const ytdlp = require("youtube-dl-exec");

const app = express();
const PORT = process.env.PORT || 4000;
const DOWNLOAD_DIR = path.resolve(__dirname, "downloads");

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR);
}

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("✅ YouTube Downloader API is running.");
});

app.get("/download/:type", async (req, res) => {
  const { type } = req.params;
  const url = req.query.url;

  if (!url || !["mp3", "mp4"].includes(type)) {
    return res.status(400).send("❌ Invalid request.");
  }

  const extension = type === "mp3" ? "mp3" : "mp4";
  const info = await ytdlp(url, { dumpSingleJson: true });
  const safeTitle = info.title.replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
  const filename = `${safeTitle || "video"}.${extension}`;
  const filepath = path.join(DOWNLOAD_DIR, filename);

  try {
    await ytdlp(url, {
      output: filepath,
      extractAudio: type === "mp3",
      audioFormat: "mp3",
      format: type === "mp4" ? "mp4" : "bestaudio",
    });

    res.setHeader("Content-Type", type === "mp3" ? "audio/mpeg" : "video/mp4");
    res.download(filepath, () => {
      fs.unlinkSync(filepath); // Delete after sending
    });

    
  } catch (err) {
    console.error("❌ Download error:", err.message);
    res.status(500).send("❌ Failed to download.");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
