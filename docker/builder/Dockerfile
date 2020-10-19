FROM node:12.18.1
ENV PATH="${PATH}:/usr/local/go/bin:/home/node/go/bin"
ENV CGO_ENABLED=0
RUN apt-get install git curl && curl -O https://dl.google.com/go/go1.14.4.linux-amd64.tar.gz && tar -xvf go1.14.4.linux-amd64.tar.gz && chown -R root:root ./go && mv go /usr/local
#USER node
RUN go get -u -d github.com/magefile/mage && cd ~/go/src/github.com/magefile/mage && go run bootstrap.go
WORKDIR /workspace
ENTRYPOINT ["tail", "-f"]
