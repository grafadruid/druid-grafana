# Druid as a Data Source for Grafana

Table of Contents
=================

* [What is this Druid-Grafana plugin ?](#what-is-this-druid-grafana-plugin)
* [Features](#features)
* [Screenshots](#screenshots)
  * [Datasource - connection](#datasource---connection)
  * [Datasource - default settings](#datasource---default-settings)
  * [Panels](#panels)
  * [Query builder - JSON](#query-builder---json)
  * [Query builder - SQL](#query-builder---sql)
  * [Query builder - timeseries](#query-builder---timeseries)
  * [Query builder - settings](#query-builder---settings)
  * [Variables](#variables)
  * [Variables - formatter - druid:json](#variables---formatter---druidjson)
  * [Explore - logs](#explore---logs)
  * [Query builder - settings - logs](#query-builder---settings---logs)
* [Contribute](#contribute)
* [Install](#install)
* [Examples](#examples)

## What is this Druid-Grafana plugin?

Grafana doesn't supports Druid as a Data Source, this plugin aims to do so.

## Features

At the time of writing, the plugin supports all Grafana features and all Druid queries:

- Druid queries: SQL, timeseries, topn, groupby, timeboundary, segmentmetadata, datasourcemetadata, scan, search, JSON
- Variables: Grafana global variables replacement, query variables, formatter `druid:json` (provide support for multi-value variables within rune queries).
- Alerts
- Explore
- Logs

> if you're using a self-signed TLS certificate, an option to "Skip TLS verify" will be shown when "https" is used in datasource URI)

## Screenshots

### Datasource - Connection

![Datasource - connection](https://raw.githubusercontent.com/grafadruid/druid-grafana/master/src/img/screenshot-datasource-connection.png)

### Datasource - Default settings

![Datasource - default settings](https://raw.githubusercontent.com/grafadruid/druid-grafana/master/src/img/screenshot-datasource-default-settings.png)

### Panels

![Panels](https://raw.githubusercontent.com/grafadruid/druid-grafana/master/src/img/screenshot-panels.png)

### Query builder - JSON

![Query builder - JSON](https://raw.githubusercontent.com/grafadruid/druid-grafana/master/src/img/screenshot-querybuilder-json.png)

### Query builder - SQL

![Query builder - SQL](https://raw.githubusercontent.com/grafadruid/druid-grafana/master/src/img/screenshot-querybuilder-sql.png)

### Query builder - Timeseries

![Query builder - timeseries](https://raw.githubusercontent.com/grafadruid/druid-grafana/master/src/img/screenshot-querybuilder-timeseries.png)

### Query builder - Settings

![Query builder - settings](https://raw.githubusercontent.com/grafadruid/druid-grafana/master/src/img/screenshot-querybuilder-settings.png)

### Variables

![Variables](https://raw.githubusercontent.com/grafadruid/druid-grafana/master/src/img/screenshot-variables.png)

### Variables - Formatter - druid:json

![Variables - formatter - druid:json](https://raw.githubusercontent.com/grafadruid/druid-grafana/master/src/img/screenshot-querybuilder-formatter-druidjson.png)

### Explore - Logs

![Explore - logs](https://raw.githubusercontent.com/grafadruid/druid-grafana/master/src/img/screenshot-explore-logs.png)

### Query builder - Settings - Logs

![Query builder - settings - logs](https://raw.githubusercontent.com/grafadruid/druid-grafana/master/src/img/screenshot-querybuilder-settings-logs.png)

## Contribute

Any contribution is welcome! Feel free to join on Slack to discuss :)
To go further, see [Contribute](https://github.com/grafadruid/druid-grafana/blob/master/CONTRIBUTE.md)

## Install

- From Grafana.com:
  `grafana-cli plugins install grafadruid-druid-datasource $VERSION`
  - If `$VERSION` is not specified latest version will be installed
- From remote archive:
  `grafana-cli --pluginUrl https://github.com/grafadruid/druid-grafana/releases/download/v$VERSION/grafadruid-druid-datasource-$VERSION.zip plugins install grafadruid-druid-datasource`
- From local archive:
  `unzip grafadruid-druid-datasource-$VERSION.zip -d $YOUR_PLUGIN_DIR`

Where `$VERSION` is for instance `1.0.0` and `$YOUR_PLUGIN_DIR` is for instance `/var/lib/grafana/plugins`

(Source: https://grafana.com/docs/grafana/latest/plugins/installation/)

### Build lolo-druid plugin on Mac and Install it via Kubernetes manually
#### Build lolo-druid plugin

Tested on Mac Pro M1 - Monterey v12.6:

* Launch Desktop Docker
* Build
```sh
./mage-macos buildAll
```

#### Copy the plugin into a Grafana Pod in Kubernetes

* Make sure you have set a proper Kubernetes context
* Rename the `dist` folder into like `lolo-grafadruid-druid-datasource`
* Copy the plugin into a Grafana Pod in Kubernetes (e.g.,)
```sh
$ kubectl get pod -n <yourNamespace>
NAME                       READY   STATUS    RESTARTS   AGE
grafana-7c549965bc-47trw   1/1     Running   0          1d

$ kubectl cp -n <yourNamespace> ./dist grafana-7c549965bc-47trw:/var/lib/grafana/plugins/lolo-grafadruid-druid-datasource
```
* Make sure your Grafana pod has the env variable: `GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS : lolo-grafadruid-druid-datasource`
* Restart the pod and check if lolo-druid is installed :)

## Examples

You can try out various advanced features of the plugin by importing the [demo dashboard](https://github.com/grafadruid/druid-grafana/blob/master/docker/grafana/dashboards/dashboard.json) and running it against the Wikipedia dataset used in the [Druid quickstart tutorial](https://druid.apache.org/docs/latest/tutorials/index.html#step-4-load-data).
> When using the provided docker based environment (`./mage env:start && ./mage`), the dataset is automatically ingested in Druid, the datasource and dashboard are automatically provisionned in Grafana.
