FROM node:16-alpine3.15
ENV CGO_ENABLED=0
RUN apk add --no-cache go python3 && npm install -g npm@8.5.3
WORKDIR /workspace
ENTRYPOINT ["tail", "-f"]
