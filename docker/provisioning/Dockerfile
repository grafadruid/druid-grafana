FROM alpine
WORKDIR /setup
RUN apk add --no-cache bash
RUN apk add --update --no-cache python2 && ln -sf python2 /usr/bin/python
COPY ./provisioning .
RUN wget https://raw.githubusercontent.com/apache/druid/master/examples/bin/post-index-task
RUN wget https://raw.githubusercontent.com/apache/druid/master/examples/bin/post-index-task-main
RUN chmod +x post-index-task post-index-task-main
RUN pwd && ls -lrt 
ENTRYPOINT [ "sh", "-c", "./post-index-task --file ingest-spec.json --url http://coordinator:8081 --complete-timeout 1200 --coordinator-url http://coordinator:8081"]
