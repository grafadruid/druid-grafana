package main

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/bitly/go-simplejson"
	"github.com/grafadruid/go-druid"
	druidquerybuilder "github.com/grafadruid/go-druid/builder"
	druidquery "github.com/grafadruid/go-druid/builder/query"
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

type druidResponse struct {
	TimeColumnIndex int
	Columns         []struct {
		Name string
		Type string
	}
	Rows [][]interface{}
}

func newDataSourceInstance(settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
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
		client:                 c,
		queryContextParameters: data.Get("query.contextParameters").MustArray(),
	}, nil
}

type druidInstanceSettings struct {
	client                 *druid.Client
	queryContextParameters []interface{}
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
		response.Responses[q.RefID] = ds.query(q, s)
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

func (ds *druidDatasource) query(qry backend.DataQuery, s *druidInstanceSettings) backend.DataResponse {
	log.DefaultLogger.Info("DRUID EXECUTE QUERY", "_________________________GRAFANA QUERY___________________________", qry)
	// maybe implement a short life cache (druidInstanceSettings.cache ?) and early return then ?
	response := backend.DataResponse{}
	q, f, err := ds.prepareQuery(qry, s)
	if err != nil {
		response.Error = err
		return response
	}
	log.DefaultLogger.Info("DRUID EXECUTE QUERY", "_________________________DRUID QUERY___________________________", q)
	r, err := ds.executeQuery(q, s)
	if err != nil {
		response.Error = err
		return response
	}
	log.DefaultLogger.Info("DRUID EXECUTE QUERY", "_________________________DRUID RESPONSE___________________________", r)
	response, err = ds.prepareResponse(r, f)
	if err != nil {
		//error could be set from prepareResponse but this gives a chance to react to error here
		response.Error = err
	}
	log.DefaultLogger.Info("DRUID EXECUTE QUERY", "_________________________GRAFANA RESPONSE___________________________", response)
	return response
}

func (ds *druidDatasource) prepareQuery(qry backend.DataQuery, s *druidInstanceSettings) (druidquerybuilder.Query, string, error) {
	var q druidQuery
	err := json.Unmarshal(qry.JSON, &q)
	if err != nil {
		return nil, "", err
	}
	q.Builder["context"] = ds.mergeQueryContexts(
		ds.prepareQueryContext(s.queryContextParameters),
		ds.prepareQueryContext(q.Settings["contextParameters"].([]interface{})))
	jsonQuery, err := json.Marshal(q.Builder)

	if err != nil {
		return nil, "", err
	}
	//here probably have to ensure __time column is selected and time interval is set based on qry given timerange (upsert), max data points to consider probably?
	query, err := s.client.Query().Load(jsonQuery)

	format := ""
	if q.Settings["format"] != nil {
		format = q.Settings["format"].(string)
	}

	return query, format, err
}

func (ds *druidDatasource) prepareQueryContext(parameters []interface{}) map[string]interface{} {
	ctx := make(map[string]interface{})
	for _, parameter := range parameters {
		p := parameter.(map[string]interface{})
		ctx[p["name"].(string)] = p["value"]
	}
	return ctx
}

func (ds *druidDatasource) mergeQueryContexts(contexts ...map[string]interface{}) map[string]interface{} {
	ctx := make(map[string]interface{})
	for _, c := range contexts {
		for k, v := range c {
			ctx[k] = v
		}
	}
	return ctx
}

func (ds *druidDatasource) executeQuery(q druidquerybuilder.Query, s *druidInstanceSettings) (*druidResponse, error) {
	r := &druidResponse{}
	qtyp := q.Type()
	switch qtyp {
	case "scan":
		q.(*druidquery.Scan).SetResultFormat("compactedList")
	case "sql":
		q.(*druidquery.SQL).SetResultFormat("array").SetHeader(true)
	}
	var result json.RawMessage
	resp, err := s.client.Query().Execute(q, &result)
	if err != nil {
		return r, err
	}
	var detectColumnType = func(c *struct {
		Name string
		Type string
	}, pos int, rr [][]interface{}) {
		typ := "nil"
		for _, r := range rr {
			switch r[pos].(type) {
			case string:
				v := r[pos].(string)
				_, err := strconv.Atoi(v)
				if err != nil {
					_, err := strconv.ParseBool(v)
					if err != nil {
						_, err := time.Parse("2006-01-02T15:04:05.000Z", v)
						if err != nil {
							typ = "string"
							break
						}
						typ = "time"
						break
					}
					typ = "bool"
					break
				}
				typ = "int"
				break
			case float64:
				if c.Name == "__time" || strings.Contains(strings.ToLower(c.Name), "time_") {
					typ = "time"
					break
				}
				typ = "float"
				break
			}
		}
		c.Type = typ
	}
	switch qtyp {
	case "scan":
		var scanr []map[string]interface{}
		err := json.Unmarshal(result, &scanr)
		if err == nil {
			for _, e := range scanr[0]["events"].([]interface{}) {
				r.Rows = append(r.Rows, e.([]interface{}))
			}
			for i, c := range scanr[0]["columns"].([]interface{}) {
				col := struct {
					Name string
					Type string
				}{Name: c.(string)}
				if c.(string) == "__time" {
					r.TimeColumnIndex = i
				}
				detectColumnType(&col, i, r.Rows)
				r.Columns = append(r.Columns, col)
			}
		}
	case "sql":
		var sqlr []interface{}
		err := json.Unmarshal(result, &sqlr)
		if err == nil {
			for _, row := range sqlr[1:] {
				r.Rows = append(r.Rows, row.([]interface{}))
			}
			for i, c := range sqlr[0].([]interface{}) {
				col := struct {
					Name string
					Type string
				}{Name: c.(string)}
				if c.(string) == "__time" {
					r.TimeColumnIndex = i
				}
				detectColumnType(&col, i, r.Rows)
				r.Columns = append(r.Columns, col)
			}
		}
	//case "timeseries":
	//var tsr []map[string]interface{}
	//err := json.Unmarshal(result, &tsr)
	//if err != nil {

	//}
	default:
		log.DefaultLogger.Info("DRUID EXECUTE QUERY", "RESPONSE", resp)
	}
	return r, err
}

func (ds *druidDatasource) prepareResponse(resp *druidResponse, format string) (backend.DataResponse, error) {
	response := backend.DataResponse{}
	frame := data.NewFrame("response")
	for ic, c := range resp.Columns {
		var ff interface{}
		switch c.Type {
		case "string":
			ff = make([]string, 0)
		case "float":
			ff = make([]float64, 0)
		case "int":
			ff = make([]int64, 0)
		case "bool":
			ff = make([]bool, 0)
		case "nil":
			ff = make([]string, 0)
		case "time":
			ff = make([]time.Time, 0)
		}
		for _, r := range resp.Rows {
			switch c.Type {
			case "string":
				if r[ic] == nil {
					r[ic] = ""
				}
				ff = append(ff.([]string), r[ic].(string))
			case "float":
				if r[ic] == nil {
					r[ic] = 0.0
				}
				ff = append(ff.([]float64), r[ic].(float64))
			case "int":
				if r[ic] == nil {
					r[ic] = "0"
				}
				i, err := strconv.Atoi(r[ic].(string))
				if err != nil {
					i = 0
				}
				ff = append(ff.([]int64), int64(i))
			case "bool":
				b, err := strconv.ParseBool(r[ic].(string))
				if err != nil {
					b = false
				}
				ff = append(ff.([]bool), b)
			case "nil":
				ff = append(ff.([]string), "nil")
			case "time":
				if r[ic] == nil {
					r[ic] = 0.0
				}
				switch r[ic].(type) {
				case string:
					t, err := time.Parse("2006-01-02T15:04:05.000Z", r[ic].(string))
					if err != nil {
						t = time.Now()
					}
					ff = append(ff.([]time.Time), t)
				case float64:
					sec, dec := math.Modf(r[ic].(float64) / 1000)
					ff = append(ff.([]time.Time), time.Unix(int64(sec), int64(dec*(1e9))))
				}
			}
		}
		frame.Fields = append(frame.Fields, data.NewField(c.Name, nil, ff))
	}
	if format == "wide" {
		frame, _ = data.LongToWide(frame, nil)
		response.Frames = append(response.Frames, frame)
	} else {
		response.Frames = append(response.Frames, frame)
	}
	return response, nil
}
