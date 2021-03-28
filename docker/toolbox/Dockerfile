#syntax=docker/dockerfile:1.2
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

RUN --mount=type=bind,source=.tool-versions,target=/workspace/.tool-versions \
    --mount=type=bind,source=docker/toolbox/asdf-init.sh,target=/workspace/asdf-init.sh \
    ./asdf-init.sh

RUN printf "%s\n" "export GOPATH=\$(asdf where golang)/go" >> ~/.bashrc

RUN --mount=type=bind,source=.tool-versions,target=/workspace/.tool-versions \
  git clone https://github.com/magefile/mage /usr/local/mage \
  && cd /usr/local/mage && source $HOME/.asdf/asdf.sh \
  && GOPATH="$(asdf where golang)/go" go run bootstrap.go

ENTRYPOINT ["tail", "-f"]
