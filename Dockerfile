# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock) to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Build your project if necessary (uncomment if you have build scripts)
# RUN npm run build

# Expose the port that your application will run on
EXPOSE 3001

# Define environment variables (if any, you can also use an ENV file)
ENV NODE_ENV=production

# Start the application
CMD ["node", "server.js"]