# Use Node.js 22 Alpine Linux image as base
FROM docker.io/node:22-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package manifests
COPY package*.json ./

# Install application dependencies (including devDependencies like nodemon)
RUN npm install

# Copy application source code
COPY . .

# Expose API port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=development
ENV PORT=5000

# Run the application using nodemon in development
CMD ["npm", "run", "dev"]
