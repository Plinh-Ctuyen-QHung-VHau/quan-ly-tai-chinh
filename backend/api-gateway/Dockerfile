FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Use pnpm if you have pnpm-lock.yaml, otherwise use npm
# RUN npm install -g pnpm
# RUN pnpm install --prod
RUN npm install --omit=dev

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
