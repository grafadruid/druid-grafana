FROM ubuntu:20.04

ENV CGO_ENABLED=0

RUN apt -q update
RUN apt -qy install \
  bash build-essential curl git gnupg libssl-dev tar wget zlib1g-dev

SHELL ["/usr/bin/bash", "-c"]

RUN printf "%s\n" "source \$HOME/.asdf/asdf.sh" >> /root/.bashrc
RUN printf "%s\n" "source \$HOME/.asdf/completions/asdf.bash" >> /root/.bashrc

RUN git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.8.0
ENV PATH="/root/.asdf/shims:/root/.asdf/bin:${PATH}"

WORKDIR /workspace

COPY docker/toolbox/asdf-init.sh .tool-versions ./
RUN ./asdf-init.sh

RUN npm config set unsafe-perm true
RUN npm i -g yarn

RUN printf "%s\n" "export GOPATH=\$(asdf where golang)/go" >> ~/.bashrc

RUN git clone https://github.com/magefile/mage /usr/local/mage \
  && cd /usr/local/mage && source $HOME/.asdf/asdf.sh \
  && GOPATH="$(asdf where golang)/go" go run bootstrap.go

ENTRYPOINT ["tail", "-f"]
