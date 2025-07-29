import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 4000;
const DOWNLOAD_DIR = path.resolve('./downloads');

// ✅ Ensure download folder exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR);
}

app.use(cors());
app.use(express.json());

// ✅ Health check
app.get('/', (req, res) => {
  res.send('✅ YouTube Downloader API is running.');
});

// 🎯 Actual download route
app.get('/download/:type', async (req, res) => {
  const { url } = req.query;
  const { type } = req.params;

  if (!url || !['mp3', 'mp4'].includes(type)) {
    return res.status(400).send('❌ Invalid URL or type.');
  }

  const extension = type === 'mp3' ? 'mp3' : 'mp4';

  // 🧠 Step 1: Get title
  const titleCommand = `yt-dlp --get-title "${url}"`;
  exec(titleCommand, (titleErr, titleStdout, titleStderr) => {
    if (titleErr) {
      console.error('❌ Failed to fetch title:', titleStderr || titleErr);
      return res.status(500).send('Failed to get video title.');
    }

    const safeTitle = titleStdout.trim().replace(/[^a-zA-Z0-9_\- ]/g, '');
    const fileName = `${safeTitle || 'video'}.${extension}`;
    const outputPath = path.join(DOWNLOAD_DIR, fileName);

    // 🎵 Step 2: Build yt-dlp command
    const command =
      type === 'mp3'
        ? `yt-dlp -f bestaudio --extract-audio --audio-format mp3 -o "${outputPath}" "${url}"`
        : `yt-dlp -f "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]" --merge-output-format mp4 -o "${outputPath}" "${url}"`;

    console.log('▶ Running yt-dlp command:', command);

    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error('❌ yt-dlp error:', stderr || err);
        return res.status(500).send('Download failed.');
      }

      console.log('✅ Download success:', stdout);

      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      const stream = fs.createReadStream(outputPath);
      stream.pipe(res);

      // ✅ Clean up after sending file
      stream.on('end', () => {
        console.log('🧹 Cleaning up downloaded file...');
        fs.unlink(outputPath, (unlinkErr) => {
          if (unlinkErr) console.error('❌ Failed to delete file:', unlinkErr);
        });
      });

      stream.on('error', (streamErr) => {
        console.error('❌ Stream error:', streamErr);
        res.status(500).send('Error sending file.');
      });
    });
  });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
