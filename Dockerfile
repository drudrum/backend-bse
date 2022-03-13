FROM node:16

# Create app directory
WORKDIR /usr/src/app

COPY ./ ./

RUN npm install
RUN npm prune --production

CMD npm start
EXPOSE 3000