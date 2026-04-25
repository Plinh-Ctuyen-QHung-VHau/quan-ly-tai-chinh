FROM node:18-alpine

WORKDIR /app

COPY identity-service/package*.json ./

RUN npm install

COPY identity-service ./
COPY shared ../shared

RUN npm run build

RUN npm prune --omit=dev

EXPOSE 3000

CMD ["node", "dist/main.js"]