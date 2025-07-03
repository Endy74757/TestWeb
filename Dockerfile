# Stage 1: Use an official Node.js runtime as a parent image
# Using alpine version for a smaller image size, which is great for production.
FROM node:18-alpine

# Declare build-time arguments for proxy settings.
ARG HTTP_PROXY
ARG HTTPS_PROXY

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first.
# This leverages Docker's layer caching. If these files don't change,
# Docker won't re-run 'npm install' on subsequent builds, speeding things up.
COPY package*.json ./

# Install dependencies, using the proxy for this step only.
# This is cleaner than setting ENV variables for the whole image.
RUN if [ -n "$HTTP_PROXY" ]; then npm config set proxy $HTTP_PROXY; fi && \
    if [ -n "$HTTPS_PROXY" ]; then npm config set https-proxy $HTTPS_PROXY; fi && \
    npm install --production && \
    npm config delete proxy && \
    npm config delete https-proxy

# Copy the rest of the application's source code into the container.
COPY . .

# Expose the port your application runs on. Adjust this if your app uses a different port.
EXPOSE 8080

# Define the command to run your application. Change 'server.js' to your app's entry point.
CMD [ "node", "server.js" ]