# Druid as a Data Source for Grafana!

## Status

- Development environment: done
- Plugin boilerplates (Frontend / Backend): done
- Query builder UI: done
- Alerting: done
- Query backend: done (sql, timeseries, topn, groupby, timeboundary, segmentmetadata, datasourcemetadata, scan, search)
- Explore advanced support: done (standard: done, advanced: todo? any specific need?)
- Variables support: done (Grafana global variables replacement, query variables)
- Extensions support: todo

## What is this Druid-Grafana plugin?

Grafana doesn't supports Druid as a Data Source, this plugin aims to do so.

## Contribute

See [Contribute](https://github.com/grafadruid/druid-grafana/blob/master/CONTRIBUTE.md)

## Install

- From Grafana.com (soon, process in progress):
`grafana-cli plugins install grafadruid-druid-datasource $VERSION`
  - If `$VERSION` is not specified latest version will be installed
- From remote archive:
`grafana-cli --pluginUrl https://github.com/grafadruid/druid-grafana/releases/download/v$VERSION/grafadruid-druid-datasource-$VERSION.zip plugins install grafadruid-druid-datasource`
- From local archive:
`unzip grafadruid-druid-datasource-$VERSION.zip -d $YOUR_PLUGIN_DIR`

Where `$VERSION` is for instance `1.0.0` and `$YOUR_PLUGIN_DIR` is for instance `/var/lib/grafana/plugins`

(Source: https://grafana.com/docs/grafana/latest/plugins/installation/)

## Usage

You can try out various advanced features of the plugin by importing the [demo dashboard](https://github.com/grafadruid/druid-grafana/blob/master/dashboard.json) and running it against the Wikipedia dataset used in the [Druid quickstart tutorial](https://druid.apache.org/docs/latest/tutorials/index.html#step-4-load-data).


