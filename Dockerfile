# Stage 1: Use an official Node.js runtime as a parent image
# Using alpine version for a smaller image size, which is great for production.
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first.
# This leverages Docker's layer caching. If these files don't change,
# Docker won't re-run 'npm install' on subsequent builds, speeding things up.
COPY package*.json ./

ENV https_proxy=http://192.168.1.6:3128
ENV http_proxy=http://192.168.1.6:3128
ARG HTTPS_PROXY=http://192.168.1.6:3128
ARG HTTP_PROXY=http://192.168.1.6:3128

# Install only production dependencies to keep the image lean.
RUN npm install --production

# Copy the rest of the application's source code into the container.
COPY . .

# Expose the port your application runs on. Adjust this if your app uses a different port.
EXPOSE 8080

# Define the command to run your application. Change 'server.js' to your app's entry point.
CMD [ "node", "server.js" ]