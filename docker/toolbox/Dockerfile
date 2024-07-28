FROM node:22-alpine3.19
WORKDIR /workspace
ENV CGO_ENABLED=0
RUN apk add --no-cache git go python3 && git config --global --add safe.directory /workspace
ENTRYPOINT ["tail", "-f"]
