# Stage 1: Use an official Node.js runtime as a parent image
# Using alpine version for a smaller image size, which is great for production.
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first.
# This leverages Docker's layer caching. If these files don't change,
# Docker won't re-run 'npm install' on subsequent builds, speeding things up.
COPY devops-portal-backend/package*.json ./

ARG http_proxy
ARG https_proxy

# Set environment variables for any tools within the RUN command that might need them.
ENV http_proxy=${http_proxy}
ENV https_proxy=${https_proxy}

# Install only production dependencies to keep the image lean.
# Using --omit=dev is the modern equivalent of --production.
# We pass the proxy directly to the npm command for maximum reliability
# and clean the cache to prevent issues from previous failed attempts.
RUN npm cache clean --force && \
    npm install --omit=dev --proxy=${http_proxy} --https-proxy=${https_proxy}

# Copy the rest of the application's source code into the container.
COPY devops-portal-backend/ .

# Unset proxy environment variables so they don't leak into the final image.
ENV http_proxy=""
ENV https_proxy=""

# Expose the port your application runs on. Adjust this if your app uses a different port.
EXPOSE 8080

# Define the command to run your application. Change 'server.js' to your app's entry point.
CMD [ "node", "server.js" ]