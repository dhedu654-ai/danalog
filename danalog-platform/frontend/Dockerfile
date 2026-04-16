# Use Node alpine image
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production + build tools)
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port (documentary, Render uses $PORT env var)
EXPOSE 3000

# Start command
CMD ["npm", "start"]
