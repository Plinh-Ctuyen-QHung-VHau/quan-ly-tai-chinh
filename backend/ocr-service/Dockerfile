FROM node:18-alpine

WORKDIR /app

COPY ocr-service/package*.json ./

RUN npm install

COPY ocr-service ./
COPY shared ./shared

RUN npm run build

RUN npm prune --omit=dev

EXPOSE 3000

CMD ["node", "dist/main.js"]