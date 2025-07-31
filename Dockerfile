# Base image with Node.js
FROM node:18-bullseye

# Install Python and ffmpeg
RUN apt update && \
    apt install -y python3 python3-pip ffmpeg

# Set working directory
WORKDIR /app

# Copy package files and install
COPY package*.json ./
RUN npm install

# Copy rest of the files
COPY . .

# Expose port
EXPOSE 8080

# Start app
CMD ["npm", "start"]
