# 16.13.2
FROM node:lts-alpine3.14    

# install ffmpeg and ffprobe
RUN apk add --no-cache ffmpeg
# have to grab yt-dlp from edge repo because not in main yet
RUN apk add --no-cache yt-dlp --repository=http://dl-cdn.alpinelinux.org/alpine/edge/community

# create destination directory
WORKDIR /opt/app

COPY package.json package-lock.json* ./

# copy the app, note .dockerignore
RUN npm install

COPY . /opt/app

# build
RUN npm run build

# expose 5555 on container
EXPOSE 5555
EXPOSE 5556

ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=5555

# start the app
CMD [ "npm", "start" ]