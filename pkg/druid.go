package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/bitly/go-simplejson"
	"github.com/grafadruid/go-druid"
	druidquery "github.com/grafadruid/go-druid/query"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

type druidQuery struct {
	Builder  map[string]interface{} `json:"builder"`
	Settings map[string]interface{} `json:"settings"`
}

func newDataSourceInstance(settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	log.DefaultLogger.Info("DRUID DS", "SETTINGS", settings)

	data, err := simplejson.NewJson(settings.JSONData)
	if err != nil {
		return &druidInstanceSettings{}, err
	}
	secureData := settings.DecryptedSecureJSONData

	var druidOpts []druid.ClientOption
	if retryMax := data.Get("connection.retryableRetryMax").MustInt(-1); retryMax != -1 {
		druidOpts = append(druidOpts, druid.WithRetryMax(retryMax))
	}
	if retryWaitMin := data.Get("connection.retryableRetryWaitMin").MustInt(-1); retryWaitMin != -1 {
		druidOpts = append(druidOpts, druid.WithRetryWaitMin(time.Duration(retryWaitMin)*time.Millisecond))
	}
	if retryWaitMax := data.Get("connection.retryableRetryWaitMax").MustInt(-1); retryWaitMax != -1 {
		druidOpts = append(druidOpts, druid.WithRetryWaitMax(time.Duration(retryWaitMax)*time.Millisecond))
	}
	if basicAuth := data.Get("connection.basicAuth").MustBool(); basicAuth {
		druidOpts = append(druidOpts, druid.WithBasicAuth(data.Get("connection.basicAuthUser").MustString(), secureData["connection.basicAuthPassword"]))
	}

	c, err := druid.NewClient(data.Get("connection.url").MustString(), druidOpts...)
	if err != nil {
		return &druidInstanceSettings{}, err
	}

	return &druidInstanceSettings{
		client: c,
	}, nil
}

type druidInstanceSettings struct {
	client       *druid.Client
	queryContext map[string]interface{}
}

func (s *druidInstanceSettings) Dispose() {
	s.client.Close()
}

func newDatasource() datasource.ServeOpts {
	ds := &druidDatasource{
		im: datasource.NewInstanceManager(newDataSourceInstance),
	}
	return datasource.ServeOpts{
		QueryDataHandler:   ds,
		CheckHealthHandler: ds,
	}
}

type druidDatasource struct {
	im instancemgmt.InstanceManager
}

func (ds *druidDatasource) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	result := &backend.CheckHealthResult{
		Status:  backend.HealthStatusError,
		Message: "Can't connect to Druid",
	}

	i, err := ds.im.Get(req.PluginContext)
	if err != nil {
		result.Message = "Can't get Druid instance"
		return result, nil
	}

	status, _, err := i.(*druidInstanceSettings).client.Common().Status()
	if err != nil {
		result.Message = "Can't fetch Druid status"
		return result, nil
	}

	result.Status = backend.HealthStatusOk
	result.Message = fmt.Sprintf("Succesfully connected to Druid %s", status.Version)
	return result, nil
}

func (ds *druidDatasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	response := backend.NewQueryDataResponse()

	s, err := ds.settings(req.PluginContext)
	if err != nil {
		return response, err
	}

	for _, q := range req.Queries {
		res := ds.query(ctx, q, s)
		response.Responses[q.RefID] = res
	}

	return response, nil
}

func (ds *druidDatasource) settings(ctx backend.PluginContext) (*druidInstanceSettings, error) {
	s, err := ds.im.Get(ctx)
	if err != nil {
		return nil, err
	}
	return s.(*druidInstanceSettings), nil
}

func (ds *druidDatasource) query(ctx context.Context, qry backend.DataQuery, s *druidInstanceSettings) backend.DataResponse {
	// maybe implement a short life cache (druidInstanceSettings.cache ?) and early return then ?
	response := backend.DataResponse{}

	q, err := ds.prepareQuery(qry.JSON, s)
	if err != nil {
		response.Error = err
		return response
	}
	log.DefaultLogger.Info("DRUID QUERY", "READY TO GO", q)

	// execute the query and probably, based on ? queryType ? adapt the results to grafana kind of dataframe (wide, long)
	frame := data.NewFrame("response")
	frame.Fields = append(frame.Fields,
		data.NewField("time", nil, []time.Time{qry.TimeRange.From, qry.TimeRange.To}),
	)
	frame.Fields = append(frame.Fields,
		data.NewField("values", nil, []int64{10, 20}),
	)
	response.Frames = append(response.Frames, frame)

	return response
}

func (ds *druidDatasource) prepareQuery(druidJSONQuery json.RawMessage, s *druidInstanceSettings) (druidquery.Query, error) {
	var q druidQuery
	err := json.Unmarshal(druidJSONQuery, &q)
	if err != nil {
		log.DefaultLogger.Info("DRUID QUERY", "FAILED", err)
		return nil, err
	}
	//merge q.Settings.contextParameters with druidInstanceSettings.contextParameters, tranform parameters into query context and add it as druidquery.Query.context
	return nil, nil
}
