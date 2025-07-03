# Stage 1: Use an official Node.js runtime as a parent image
# Using alpine version for a smaller image size, which is great for production.
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first.
# This leverages Docker's layer caching. If these files don't change,
# Docker won't re-run 'npm install' on subsequent builds, speeding things up.
COPY package*.json ./

# Use ARG for build-time proxy settings.
# You can override these with --build-arg on the command line.
ARG PROXY_URL=http://192.168.1.6:3128

# Set environment variables for proxy for any tools that might need them during the build.
ENV http_proxy=$PROXY_URL
ENV https_proxy=$PROXY_URL

# Install only production dependencies to keep the image lean.
# We pass the proxy settings directly to the npm command for reliability.
# We also clean the cache first to avoid potential corruption issues.
RUN npm cache clean --force && \
    npm install --production --proxy ${PROXY_URL} --https-proxy ${PROXY_URL}

# Copy the rest of the application's source code into the container.
COPY . .

# Unset the proxy environment variables so they don't exist in the final image.
# This is a good security practice.
ENV http_proxy=""
ENV https_proxy=""

# Expose the port your application runs on. Adjust this if your app uses a different port.
EXPOSE 8080

# Define the command to run your application. Change 'server.js' to your app's entry point.
CMD [ "node", "server.js" ]