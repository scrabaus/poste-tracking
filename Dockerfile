FROM ghcr.io/puppeteer/puppeteer:latest

# Skip downloading Chrome as we use the installed one from the base image
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

COPY package*.json ./
# Install only production dependencies
RUN npm ci --omit=dev

COPY . .

CMD [ "node", "server.js" ]
