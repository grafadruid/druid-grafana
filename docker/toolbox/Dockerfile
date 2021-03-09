FROM node:14.15.4
ENV PATH="${PATH}:/usr/local/go/bin:/home/node/go/bin"
ENV CGO_ENABLED=0
RUN apt-get install git curl && curl -O https://dl.google.com/go/go1.14.4.linux-amd64.tar.gz && tar -xvf go1.14.4.linux-amd64.tar.gz && chown -R root:root ./go && mv go /usr/local
WORKDIR /ingest
COPY ./provisioning .
RUN wget https://raw.githubusercontent.com/apache/druid/master/examples/bin/post-index-task
RUN wget https://raw.githubusercontent.com/apache/druid/master/examples/bin/post-index-task-main
RUN chmod +x post-index-task post-index-task-main
RUN pwd && ls -lrt 
USER node
RUN go get -u -d github.com/magefile/mage && cd ~/go/src/github.com/magefile/mage && go run bootstrap.go
WORKDIR /workspace
ENTRYPOINT ["sh", "-c", "/ingest/post-index-task --file /ingest/ingest-spec.json --url http://coordinator:8081 --complete-timeout 1200 --coordinator-url http://coordinator:8081 && tail", "-f"]
