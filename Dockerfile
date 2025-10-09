# Use Node.js LTS
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy project from Kuwotech_Sales_Management subdirectory
COPY Kuwotech_Sales_Management/ .

# Install backend dependencies
RUN cd backend && npm install --production

# Expose port
EXPOSE 3000

# Start server from project root
CMD ["node", "backend/server.js"]
