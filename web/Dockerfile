FROM node:22

RUN groupadd -r appgroup && useradd -r -g appgroup -d /app appuser

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN chown -R appuser:appgroup /app

USER appuser

CMD ["node", "server.js"]
