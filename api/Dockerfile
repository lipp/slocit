FROM node:8-alpine
RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package.json /usr/src/app/
RUN npm i --production
COPY . /usr/src/app
EXPOSE 3000
ENV NODE_ENV production
CMD ["npm", "start"]
