FROM ghcr.io/puppeteer/puppeteer:latest

# Switch to root to install dependencies and fix permissions
USER root

WORKDIR /usr/src/app

COPY package*.json ./
# Install dependencies (ignoring scripts to avoid trying to download chrome again if not needed, though Env checks that)
RUN npm install

COPY . .

# Ensure pptruser allows writing if needed (e.g. for temporary files), though mostly for reading
RUN chown -R pptruser:pptruser /usr/src/app

# Switch back to the non-root user for security and to match the base image
USER pptruser

CMD [ "node", "server.js" ]
