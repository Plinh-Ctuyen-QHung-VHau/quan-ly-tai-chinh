FROM node:18-alpine

WORKDIR /app

COPY finance-intelligence/package*.json ./

RUN npm install

COPY finance-intelligence ./
COPY shared ../shared

RUN npm run build

RUN npm prune --omit=dev

EXPOSE 3000

CMD ["node", "dist/app/src/main.js"]
