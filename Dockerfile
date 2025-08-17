FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY src/ ./src/
COPY config.json ./

EXPOSE 8080

USER node

CMD ["npm", "start"]