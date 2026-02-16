FROM ghcr.io/puppeteer/puppeteer:latest

# Switch to root to install dependencies
USER root

WORKDIR /usr/src/app

COPY package*.json ./
# Install dependencies cleanly (without downloading chrome)
RUN npm ci

COPY . .

# Give permissions to the non-root user
RUN chown -R pptruser:pptruser /usr/src/app

# Switch back to the safe user
USER pptruser

CMD [ "node", "server.js" ]
