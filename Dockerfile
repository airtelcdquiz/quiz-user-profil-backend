FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY src ./src

EXPOSE 3000

RUN npx prisma migrate dev --name init

CMD ["node", "src/server.js"]
