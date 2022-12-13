FROM node:16-alpine

USER node
RUN mkdir /home/node/app
WORKDIR /home/node/app

COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile --registry https://registry.npmmirror.com
COPY . .

EXPOSE 3000

CMD ["yarn", "dev"]
