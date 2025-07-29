import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 4000;
const DOWNLOAD_DIR = path.resolve('./downloads');

// Make sure download folder exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR);
}

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('✅ YouTube Downloader API is running.');
});

app.get('/download/:type', async (req, res) => {
  const url = req.query.url;
  const type = req.params.type;

  if (!url || !['mp3', 'mp4'].includes(type)) {
    return res.status(400).send('❌ Invalid URL or type.');
  }

  const extension = type === 'mp3' ? 'mp3' : 'mp4';

  // Step 1: Get the title from yt-dlp
  const titleCommand = `yt-dlp.exe --get-title "${url}"`;

  exec(titleCommand, (titleErr, titleStdout) => {
    if (titleErr) {
      console.error('❌ Failed to fetch title:', titleErr);
      return res.status(500).send('Failed to get video title.');
    }

    const safeTitle = titleStdout.trim().replace(/[^a-zA-Z0-9_\- ]/g, '');
    const fileName = `${safeTitle}.${extension}`;
    const outputPath = path.join(DOWNLOAD_DIR, fileName);

    let command = '';
    if (type === 'mp3') {
      command = `yt-dlp.exe -f bestaudio --extract-audio --audio-format mp3 -o "${outputPath}" "${url}"`;
    } else if (type === 'mp4') {
      command = `yt-dlp.exe -f "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]" --merge-output-format mp4 -o "${outputPath}" "${url}"`;
    }

    console.log('▶ Running command:', command);

    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error('❌ yt-dlp error:', stderr);
        return res.status(500).send('Download failed.');
      }

      console.log('✅ yt-dlp success:\n', stdout);

      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      const stream = fs.createReadStream(outputPath);
      stream.pipe(res);

      stream.on('end', () => {
        console.log('🧹 Cleaning up...');
        fs.unlinkSync(outputPath);
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
