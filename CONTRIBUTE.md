# Getting started

A data source backend plugin consists of both frontend (TypeScript) and backend (Golang) components. A TypeScript development environment and a Golang one are needed in order to work over that plugin.
For more technical information about backend plugins, refer to the documentation on [Backend plugins](https://grafana.com/docs/grafana/latest/developers/plugins/backend/).

## Development environment

The unified development environment is built atop Docker containers, composed with Docker Compose. It provides a running Druid instance, a running Grafana instance, and a builder container.
You, only, gonna need to install Compose (See https://docs.docker.com/compose/install).

Any "building" is done within the `builder` container (that saves you from setting up Node and Golang development environments on your host).

Mage (See https://magefile.org) is used in order to run commands over that environment (mostly within that `builder` container).

_If you don't want to run commands in that development environment container, you can set the environment variable `DOCKER=0` and the commands will be run against your host._

In the same "plug & play" spirit, Mage is provided as a binary so you don't have have to install it locally.

- To start the environment, run: `./mage env:start`
- To stop the environment, run: `./mage env:stop`
- To build frontend part of the plugin, run `./mage frontend:build`
- To build backend part of the plugin, run `./mage backend:build`
- To build the whole plugin, run `./mage buildAll` (or simply, `./mage`)

Few more targets are available (tests, cleanup, ...), you can list them all with `./mage -l`.

_If you update `Magefile.go`, you could use `./mage env:updateMage` in order to update the mage binary._

_Beware the `sdk:*` (provided by Grafana backend plugin SDK) targets won't run within the container, but directly on the host; those commands are exactly the ones proxied thru the `builder` container thru the `backend:*` targets_
