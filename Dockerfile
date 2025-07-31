# Base image with Python and Node.js
FROM node:18-bullseye

# Install Python
RUN apt update && apt install -y python3 python3-pip

# Set working directory
WORKDIR /app

# Copy package files and install
COPY package*.json ./
RUN npm install

# Copy rest of the files
COPY . .

# Expose port 8080
EXPOSE 8080

# Start the app
CMD ["npm", "start"]
