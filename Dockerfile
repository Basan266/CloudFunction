# Base image with Node.js
FROM node:18-bullseye

# Install Python, ffmpeg, and yt-dlp
RUN apt-get update && \
    apt-get install -y python3 python3-pip ffmpeg && \
    pip3 install --no-cache-dir -U yt-dlp && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# ✅ IMPORTANT: Skip youtube-dl-exec auto download (avoids GitHub rate limit)
ENV YOUTUBE_DL_SKIP_DOWNLOAD=true

# Copy package files and install
COPY package*.json ./
RUN npm install

# Copy rest of the files
COPY . .

# Expose port
EXPOSE 8080

# Start app
CMD ["npm", "start"]
