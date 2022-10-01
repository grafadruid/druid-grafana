FROM node:16-alpine3.16
WORKDIR /workspace
ENV CGO_ENABLED=0
RUN apk add --no-cache git go python3 && git config --global --add safe.directory /workspace && npm install -g npm@8.19.2
ENTRYPOINT ["tail", "-f"]
