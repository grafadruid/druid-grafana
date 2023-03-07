package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"sort"
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

// Internal interval and range variables
var (
	varInterval     = variableVariants("__interval")
	varIntervalMs   = variableVariants("__interval_ms")
	varRange        = variableVariants("__range")
	varRangeS       = variableVariants("__range_s")
	varRangeMs      = variableVariants("__range_ms")
	varRateInterval = variableVariants("__rate_interval")
)

func variableVariants(base string) []string {
	return []string{
		fmt.Sprintf(`"${%s}"`, base),
		fmt.Sprintf(`"$%s"`, base),
		fmt.Sprintf(`$%s`, base),
		fmt.Sprintf(`${%s}`, base),
	}
}

type druidQuery struct {
	Builder  map[string]interface{} `json:"builder"`
	Settings map[string]interface{} `json:"settings"`
}

type druidResponse struct {
	Reference string
	Columns   []struct {
		Name string
		Type string
	}
	Rows [][]interface{}
}

type druidInstanceSettings struct {
	client               *druid.Client
	defaultQuerySettings map[string]interface{}
}

func (s *druidInstanceSettings) Dispose() {
	s.client.Close()
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
	if skipTLS := data.Get("connection.skipTls").MustBool(); skipTLS {
		druidOpts = append(druidOpts, druid.WithSkipTLSVerify())
	}

	c, err := druid.NewClient(data.Get("connection.url").MustString(), druidOpts...)
	if err != nil {
		return &druidInstanceSettings{}, err
	}

	return &druidInstanceSettings{
		client:               c,
		defaultQuerySettings: prepareQuerySettings(settings.JSONData),
	}, nil
}

func prepareQuerySettings(data json.RawMessage) map[string]interface{} {
	var d map[string]interface{}
	settings := make(map[string]interface{})
	err := json.Unmarshal(data, &d)
	if err != nil {
		return settings
	}
	for k, v := range d {
		if strings.HasPrefix(k, "query.") {
			settings[strings.TrimPrefix(k, "query.")] = v
		}
	}
	return settings
}

func mergeSettings(settings ...map[string]interface{}) map[string]interface{} {
	stg := make(map[string]interface{})
	for _, s := range settings {
		for k, v := range s {
			stg[k] = v
		}
	}
	return stg
}

func newDatasource() datasource.ServeOpts {
	ds := &druidDatasource{
		im: datasource.NewInstanceManager(newDataSourceInstance),
	}

	return datasource.ServeOpts{
		QueryDataHandler:    ds,
		CheckHealthHandler:  ds,
		CallResourceHandler: ds,
	}
}

type druidDatasource struct {
	im instancemgmt.InstanceManager
}

func (ds *druidDatasource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	var err error
	var body interface{}
	var code int
	body = "Unknown error"
	code = 500
	switch req.Path {
	case "query-variable":
		switch req.Method {
		case "POST":
			body, err = ds.QueryVariableData(ctx, req)
			if err == nil {
				code = 200
			}
		default:
			body = "Method not supported"
		}
	default:
		body = "Path not supported"
	}
	resp := &backend.CallResourceResponse{Status: code}
	resp.Body, err = json.Marshal(body)
	sender.Send(resp)
	return nil
}

type grafanaMetricFindValue struct {
	Value interface{} `json:"value"`
	Text  string      `json:"text"`
}

func (ds *druidDatasource) QueryVariableData(ctx context.Context, req *backend.CallResourceRequest) ([]grafanaMetricFindValue, error) {
	log.DefaultLogger.Info("QUERY VARIABLE", "_________________________REQ___________________________", string(req.Body))
	s, err := ds.settings(req.PluginContext)
	if err != nil {
		return []grafanaMetricFindValue{}, err
	}
	return ds.queryVariable(req.Body, s)
}

func (ds *druidDatasource) queryVariable(qry []byte, s *druidInstanceSettings) ([]grafanaMetricFindValue, error) {
	log.DefaultLogger.Info("DRUID EXECUTE QUERY VARIABLE", "_________________________GRAFANA QUERY___________________________", string(qry))
	// feature: probably implement a short (1s ? 500ms ? configurable in datasource ? beware memory: constrain size ?) life cache (druidInstanceSettings.cache ?) and early return then
	response := []grafanaMetricFindValue{}
	q, stg, err := ds.prepareQuery(qry, s)
	if err != nil {
		return response, err
	}
	log.DefaultLogger.Info("DRUID EXECUTE QUERY VARIABLE", "_________________________DRUID QUERY___________________________", q)
	r, err := ds.executeQuery("variable", q, s, stg)
	if err != nil {
		return response, err
	}
	log.DefaultLogger.Info("DRUID EXECUTE QUERY VARIABLE", "_________________________DRUID RESPONSE___________________________", r)
	response, err = ds.prepareVariableResponse(r, stg)
	log.DefaultLogger.Info("DRUID EXECUTE QUERY VARIABLE", "_________________________GRAFANA RESPONSE___________________________", response)
	return response, err
}

func (ds *druidDatasource) prepareVariableResponse(resp *druidResponse, settings map[string]interface{}) ([]grafanaMetricFindValue, error) {
	// refactor: probably some method that returns a container (make([]whattypeever, 0)) and its related appender func based on column type)
	response := []grafanaMetricFindValue{}
	for ic, c := range resp.Columns {
		for _, r := range resp.Rows {
			switch c.Type {
			case "string":
				if r[ic] != nil {
					response = append(response, grafanaMetricFindValue{Value: r[ic].(string), Text: r[ic].(string)})
				}
			case "float":
				if r[ic] != nil {
					response = append(response, grafanaMetricFindValue{Value: r[ic].(float64), Text: fmt.Sprintf("%f", r[ic].(float64))})
				}
			case "int":
				if r[ic] != nil {
					i, err := strconv.Atoi(r[ic].(string))
					if err != nil {
						i = 0
					}
					response = append(response, grafanaMetricFindValue{Value: i, Text: r[ic].(string)})
				}
			case "bool":
				var b bool
				var err error
				b, ok := r[ic].(bool)
				if !ok {
					b, err = strconv.ParseBool(r[ic].(string))
					if err != nil {
						b = false
					}
				}
				var i int
				if b {
					i = 1
				} else {
					i = 0
				}
				response = append(response, grafanaMetricFindValue{Value: i, Text: strconv.FormatBool(b)})
			case "time":
				var t time.Time
				var err error
				if r[ic] == nil {
					r[ic] = 0.0
				}
				switch r[ic].(type) {
				case string:
					t, err = time.Parse("2006-01-02T15:04:05.000Z", r[ic].(string))
					if err != nil {
						t = time.Now()
					}
				case float64:
					sec, dec := math.Modf(r[ic].(float64) / 1000)
					t = time.Unix(int64(sec), int64(dec*(1e9)))
				}
				response = append(response, grafanaMetricFindValue{Value: t.Unix(), Text: t.Format(time.UnixDate)})
			}
		}
	}
	return response, nil
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
	rawQuery := interpolateVariables(string(qry.JSON), qry.Interval, qry.TimeRange.Duration())

	// feature: probably implement a short (1s ? 500ms ? configurable in datasource ? beware memory: constrain size ?) life cache (druidInstanceSettings.cache ?) and early return then
	response := backend.DataResponse{}
	q, stg, err := ds.prepareQuery([]byte(rawQuery), s)
	if err != nil {
		response.Error = err
		return response
	}
	log.DefaultLogger.Info("DRUID EXECUTE QUERY", "_________________________DRUID QUERY___________________________", q)
	r, err := ds.executeQuery(qry.RefID, q, s, stg)
	if err != nil {
		response.Error = err
		return response
	}
	log.DefaultLogger.Info("DRUID EXECUTE QUERY", "_________________________DRUID RESPONSE___________________________", r)
	response, err = ds.prepareResponse(r, stg)
	if err != nil {
		// note: error could be set from prepareResponse but this gives a chance to react to error here
		response.Error = err
	}
	log.DefaultLogger.Info("DRUID EXECUTE QUERY", "_________________________GRAFANA RESPONSE___________________________", response)
	return response
}

func interpolateVariables(expr string, interval time.Duration, timeRange time.Duration) string {
	rangeMs := timeRange.Milliseconds()
	rangeSRounded := int64(math.Round(float64(rangeMs) / 1000.0))

	expr = multiReplace(expr, varIntervalMs, strconv.FormatInt(int64(interval/time.Millisecond), 10))
	expr = multiReplace(expr, varInterval, formatDuration(interval))
	expr = multiReplace(expr, varRangeMs, strconv.FormatInt(rangeMs, 10))
	expr = multiReplace(expr, varRangeS, strconv.FormatInt(rangeSRounded, 10))
	expr = multiReplace(expr, varRange, strconv.FormatInt(rangeSRounded, 10)+"s")
	expr = multiReplace(expr, varRateInterval, interval.String())

	return expr
}

func multiReplace(s string, olds []string, new string) string {
	res := s
	for _, old := range olds {
		res = strings.ReplaceAll(res, old, new)
	}
	return res
}

func formatDuration(inter time.Duration) string {
	day := time.Hour * 24
	year := day * 365
	if inter >= year {
		return fmt.Sprintf("%dy", inter/year)
	}

	if inter >= day {
		return fmt.Sprintf("%dd", inter/day)
	}

	if inter >= time.Hour {
		return fmt.Sprintf("%dh", inter/time.Hour)
	}

	if inter >= time.Minute {
		return fmt.Sprintf("%dm", inter/time.Minute)
	}

	if inter >= time.Second {
		return fmt.Sprintf("%ds", inter/time.Second)
	}

	if inter >= time.Millisecond {
		return fmt.Sprintf("%dms", inter/time.Millisecond)
	}

	return "1ms"
}

func (ds *druidDatasource) prepareQuery(qry []byte, s *druidInstanceSettings) (druidquerybuilder.Query, map[string]interface{}, error) {
	var q druidQuery
	err := json.Unmarshal(qry, &q)
	if err != nil {
		return nil, nil, err
	}
	if q.Builder == nil || q.Settings == nil {
		// Don't return an error here, as this isn't a user error
		// Grafana seems to invoke this even before the user has entered any query
		log.DefaultLogger.Debug("Invalid query issued to Druid Plugin: missing builder or settings", "query:", string(qry))
		return nil, nil, nil
	}

	var defaultQueryContext map[string]interface{}
	if defaultContextParameters, ok := s.defaultQuerySettings["contextParameters"]; ok {
		defaultQueryContext = ds.prepareQueryContext(defaultContextParameters.([]interface{}))
	}
	q.Builder["context"] = defaultQueryContext
	if queryContextParameters, ok := q.Settings["contextParameters"]; ok {
		q.Builder["context"] = mergeSettings(
			defaultQueryContext,
			ds.prepareQueryContext(queryContextParameters.([]interface{})))
	}
	jsonQuery, err := json.Marshal(q.Builder)
	if err != nil {
		return nil, nil, err
	}
	query, err := s.client.Query().Load(jsonQuery)
	// feature: could ensure __time column is selected, time interval is set based on qry given timerange and consider max data points ?
	return query, mergeSettings(s.defaultQuerySettings, q.Settings), err
}

func (ds *druidDatasource) prepareQueryContext(parameters []interface{}) map[string]interface{} {
	ctx := make(map[string]interface{})
	if parameters != nil {
		for _, parameter := range parameters {
			p := parameter.(map[string]interface{})
			ctx[p["name"].(string)] = p["value"]
		}
	}
	return ctx
}

func (ds *druidDatasource) executeQuery(queryRef string, q druidquerybuilder.Query, s *druidInstanceSettings, settings map[string]interface{}) (*druidResponse, error) {
	// refactor: probably need to extract per-query preprocessor and postprocessor into a per-query file. load those "plugins" (ak. QueryProcessor ?) into a register and then do something like plugins[q.Type()].preprocess(q) and plugins[q.Type()].postprocess(r)
	r := &druidResponse{Reference: queryRef}
	qtyp := q.Type()
	switch qtyp {
	case "sql":
		q.(*druidquery.SQL).SetResultFormat("array").SetHeader(true)
	case "scan":
		q.(*druidquery.Scan).SetResultFormat("compactedList")
	}
	var result json.RawMessage
	_, err := s.client.Query().Execute(q, &result)
	if err != nil {
		return r, err
	}
	detectColumnType := func(c *struct {
		Name string
		Type string
	}, pos int, rr [][]interface{},
	) {
		t := map[string]int{"nil": 0}
		for i := 0; i < len(rr); i += int(math.Ceil(float64(len(rr)) / 5.0)) {
			r := rr[i]
			switch r[pos].(type) {
			case string:
				v := r[pos].(string)
				_, err := strconv.Atoi(v)
				if err != nil {
					_, err := strconv.ParseBool(v)
					if err != nil {
						_, err := time.Parse("2006-01-02T15:04:05.000Z", v)
						if err != nil {
							t["string"]++
							continue
						}
						t["time"]++
						continue
					}
					t["bool"]++
					continue
				}
				t["int"]++
				continue
			case float64:
				if c.Name == "__time" || strings.Contains(strings.ToLower(c.Name), "time_") {
					t["time"]++
					continue
				}
				t["float"]++
				continue
			case bool:
				t["bool"]++
				continue
			}
		}
		election := func(values map[string]int) string {
			type kv struct {
				Key   string
				Value int
			}
			var ss []kv
			for k, v := range values {
				ss = append(ss, kv{k, v})
			}
			sort.Slice(ss, func(i, j int) bool {
				return ss[i].Value > ss[j].Value
			})
			if len(ss) == 2 {
				return ss[0].Key
			}
			return "string"
		}
		c.Type = election(t)
	}
	switch qtyp {
	case "sql":
		var sqlr []interface{}
		err := json.Unmarshal(result, &sqlr)
		if err == nil && len(sqlr) > 1 {
			for _, row := range sqlr[1:] {
				r.Rows = append(r.Rows, row.([]interface{}))
			}
			for i, c := range sqlr[0].([]interface{}) {
				col := struct {
					Name string
					Type string
				}{Name: c.(string)}
				detectColumnType(&col, i, r.Rows)
				r.Columns = append(r.Columns, col)
			}
		}
	case "timeseries":
		var tsr []map[string]interface{}
		err := json.Unmarshal(result, &tsr)
		if err == nil && len(tsr) > 0 {
			columns := []string{"timestamp"}
			for c := range tsr[0]["result"].(map[string]interface{}) {
				columns = append(columns, c)
			}
			for _, result := range tsr {
				var row []interface{}
				t := result["timestamp"]
				if t == nil {
					// grand total, lets keep it last
					t = r.Rows[len(r.Rows)-1][0]
				}
				row = append(row, t)
				colResults := result["result"].(map[string]interface{})
				for _, c := range columns[1:] {
					row = append(row, colResults[c])
				}
				r.Rows = append(r.Rows, row)
			}
			for i, c := range columns {
				col := struct {
					Name string
					Type string
				}{Name: c}
				detectColumnType(&col, i, r.Rows)
				r.Columns = append(r.Columns, col)
			}
		}
	case "topN":
		var tn []map[string]interface{}
		err := json.Unmarshal(result, &tn)
		if err == nil && len(tn) > 0 && len(tn[0]["result"].([]interface{})) > 0 {
			columns := []string{"timestamp"}
			for c := range tn[0]["result"].([]interface{})[0].(map[string]interface{}) {
				columns = append(columns, c)
			}
			for _, result := range tn {
				for _, record := range result["result"].([]interface{}) {
					var row []interface{}
					row = append(row, result["timestamp"])
					o := record.(map[string]interface{})
					for _, c := range columns[1:] {
						row = append(row, o[c])
					}
					r.Rows = append(r.Rows, row)
				}
			}
			for i, c := range columns {
				col := struct {
					Name string
					Type string
				}{Name: c}
				detectColumnType(&col, i, r.Rows)
				r.Columns = append(r.Columns, col)
			}
		}
	case "groupBy":
		var gb []map[string]interface{}
		err := json.Unmarshal(result, &gb)
		if err == nil && len(gb) > 0 {
			columns := []string{"timestamp"}
			for c := range gb[0]["event"].(map[string]interface{}) {
				columns = append(columns, c)
			}
			for _, result := range gb {
				var row []interface{}
				row = append(row, result["timestamp"])
				colResults := result["event"].(map[string]interface{})
				for _, c := range columns[1:] {
					row = append(row, colResults[c])
				}
				r.Rows = append(r.Rows, row)
			}
			for i, c := range columns {
				col := struct {
					Name string
					Type string
				}{Name: c}
				detectColumnType(&col, i, r.Rows)
				r.Columns = append(r.Columns, col)
			}
		}
	case "scan":
		var scanr []map[string]interface{}
		err := json.Unmarshal(result, &scanr)
		if err == nil && len(scanr) > 0 {
			for _, e := range scanr[0]["events"].([]interface{}) {
				r.Rows = append(r.Rows, e.([]interface{}))
			}
			for i, c := range scanr[0]["columns"].([]interface{}) {
				col := struct {
					Name string
					Type string
				}{Name: c.(string)}
				detectColumnType(&col, i, r.Rows)
				r.Columns = append(r.Columns, col)
			}
		}
	case "search":
		var s []map[string]interface{}
		err := json.Unmarshal(result, &s)
		if err == nil && len(s) > 0 {
			columns := []string{"timestamp"}
			for c := range s[0]["result"].([]interface{})[0].(map[string]interface{}) {
				columns = append(columns, c)
			}
			for _, result := range s {
				for _, record := range result["result"].([]interface{}) {
					var row []interface{}
					row = append(row, result["timestamp"])
					o := record.(map[string]interface{})
					for _, c := range columns[1:] {
						row = append(row, o[c])
					}
					r.Rows = append(r.Rows, row)
				}
			}
			for i, c := range columns {
				col := struct {
					Name string
					Type string
				}{Name: c}
				detectColumnType(&col, i, r.Rows)
				r.Columns = append(r.Columns, col)
			}
		}
	case "timeBoundary":
		var tb []map[string]interface{}
		err := json.Unmarshal(result, &tb)
		if err == nil && len(tb) > 0 {
			columns := []string{"timestamp"}
			for c := range tb[0]["result"].(map[string]interface{}) {
				columns = append(columns, c)
			}
			for _, result := range tb {
				var row []interface{}
				row = append(row, result["timestamp"])
				colResults := result["result"].(map[string]interface{})
				for _, c := range columns[1:] {
					row = append(row, colResults[c])
				}
				r.Rows = append(r.Rows, row)
			}
			for i, c := range columns {
				col := struct {
					Name string
					Type string
				}{Name: c}
				detectColumnType(&col, i, r.Rows)
				r.Columns = append(r.Columns, col)
			}
		}
	case "dataSourceMetadata":
		var dsm []map[string]interface{}
		err := json.Unmarshal(result, &dsm)
		if err == nil && len(dsm) > 0 {
			columns := []string{"timestamp"}
			for c := range dsm[0]["result"].(map[string]interface{}) {
				columns = append(columns, c)
			}
			for _, result := range dsm {
				var row []interface{}
				row = append(row, result["timestamp"])
				colResults := result["result"].(map[string]interface{})
				for _, c := range columns[1:] {
					row = append(row, colResults[c])
				}
				r.Rows = append(r.Rows, row)
			}
			for i, c := range columns {
				col := struct {
					Name string
					Type string
				}{Name: c}
				detectColumnType(&col, i, r.Rows)
				r.Columns = append(r.Columns, col)
			}
		}
	case "segmentMetadata":
		var sm []map[string]interface{}
		err := json.Unmarshal(result, &sm)
		if err == nil && len(sm) > 0 {
			var columns []string
			switch settings["view"].(string) {
			case "base":
				for k, v := range sm[0] {
					if k != "aggregators" && k != "columns" && k != "timestampSpec" {
						if k == "intervals" {
							for i := range v.([]interface{}) {
								pos := strconv.Itoa(i)
								columns = append(columns, "interval_start_"+pos)
								columns = append(columns, "interval_stop_"+pos)
							}
						} else {
							columns = append(columns, k)
						}
					}
				}
				for _, result := range sm {
					var row []interface{}
					for _, c := range columns {
						var col interface{}
						if strings.HasPrefix(c, "interval_") {
							parts := strings.Split(c, "_")
							pos := 0
							if parts[1] == "stop" {
								pos = 1
							}
							idx, err := strconv.Atoi(parts[2])
							if err != nil {
								return r, errors.New("interval parsing goes wrong")
							}
							ii := result["intervals"].([]interface{})[idx]
							col = strings.Split(ii.(string), "/")[pos]
						} else {
							col = result[c]
						}
						row = append(row, col)
					}
					r.Rows = append(r.Rows, row)
				}
			case "aggregators":
				for _, v := range sm[0]["aggregators"].(map[string]interface{}) {
					columns = append(columns, "aggregator")
					for k := range v.(map[string]interface{}) {
						columns = append(columns, k)
					}
					break
				}
				for _, result := range sm {
					for k, v := range result["aggregators"].(map[string]interface{}) {
						var row []interface{}
						for _, c := range columns {
							var col interface{}
							if c == "aggregator" {
								col = k
							} else {
								col = v.(map[string]interface{})[c]
							}
							row = append(row, col)
						}
						r.Rows = append(r.Rows, row)
					}
				}
			case "columns":
				for _, v := range sm[0]["columns"].(map[string]interface{}) {
					columns = append(columns, "column")
					for k := range v.(map[string]interface{}) {
						columns = append(columns, k)
					}
					break
				}
				for _, result := range sm {
					for k, v := range result["columns"].(map[string]interface{}) {
						var row []interface{}
						for _, c := range columns {
							var col interface{}
							if c == "column" {
								col = k
							} else {
								col = v.(map[string]interface{})[c]
							}
							row = append(row, col)
						}
						r.Rows = append(r.Rows, row)
					}
				}
			case "timestampspec":
				for k := range sm[0]["timestampSpec"].(map[string]interface{}) {
					columns = append(columns, k)
				}
				for _, result := range sm {
					var row []interface{}
					for _, c := range columns {
						col := result["timestampSpec"].(map[string]interface{})[c]
						row = append(row, col)
					}
					r.Rows = append(r.Rows, row)
				}
			}
			for i, c := range columns {
				col := struct {
					Name string
					Type string
				}{Name: c}
				detectColumnType(&col, i, r.Rows)
				r.Columns = append(r.Columns, col)
			}

		}
	default:
		return r, errors.New("unknown query type")
	}
	return r, err
}

func (ds *druidDatasource) prepareResponse(resp *druidResponse, settings map[string]interface{}) (backend.DataResponse, error) {
	// refactor: probably some method that returns a container (make([]whattypeever, 0)) and its related appender func based on column type)
	response := backend.DataResponse{}
	frame := data.NewFrame(resp.Reference)
	// fetch settings
	hideEmptyColumns, _ := settings["hideEmptyColumns"].(bool)
	responseLimit, _ := settings["responseLimit"].(float64)
	format, found := settings["format"]
	if !found {
		format = "long"
	} else {
		format = format.(string)
	}
	// turn druid response into grafana long frame
	if responseLimit > 0 && len(resp.Rows) > int(responseLimit) {
		resp.Rows = resp.Rows[:int(responseLimit)]
		response.Error = fmt.Errorf("query response limit exceeded (> %d rows): consider adding filters and/or reducing the query time range", int(responseLimit))
	}
	for ic, c := range resp.Columns {
		var ff interface{}
		columnIsEmpty := true
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
			if columnIsEmpty && r[ic] != nil && r[ic] != "" {
				columnIsEmpty = false
			}
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
				var b bool
				var err error
				b, ok := r[ic].(bool)
				if !ok {
					b, err = strconv.ParseBool(r[ic].(string))
					if err != nil {
						b = false
					}
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
		if hideEmptyColumns && columnIsEmpty {
			continue
		}
		frame.Fields = append(frame.Fields, data.NewField(c.Name, nil, ff))
	}
	// convert to other formats if specified
	if format == "wide" && len(frame.Fields) > 0 {
		f, err := data.LongToWide(frame, nil)
		if err == nil {
			frame = f
		}
	} else if format == "log" && len(frame.Fields) > 0 {
		f, err := longToLog(frame, settings)
		if err == nil {
			frame = f
		}
	}
	response.Frames = append(response.Frames, frame)
	return response, nil
}

func longToLog(longFrame *data.Frame, settings map[string]interface{}) (*data.Frame, error) {
	logFrame := data.NewFrame("response")
	logFrame.SetMeta(&data.FrameMeta{PreferredVisualization: data.VisTypeLogs})
	// fetch settings
	logColumnTime, found := settings["logColumnTime"]
	if !found {
		logColumnTime = "__time"
	} else {
		logColumnTime = logColumnTime.(string)
	}
	logColumnLevel, found := settings["logColumnLevel"]
	if !found {
		logColumnLevel = "level"
	} else {
		logColumnLevel = logColumnLevel.(string)
	}
	logColumnMessage, found := settings["logColumnMessage"]
	if !found {
		logColumnMessage = "message"
	} else {
		logColumnMessage = logColumnMessage.(string)
	}
	// make sure the special time and message fields come first in the frame because that's how
	// the log ui decides what time and message to display
	for _, f := range longFrame.Fields {
		if f.Name == logColumnTime || f.Name == logColumnMessage {
			logFrame.Fields = append(logFrame.Fields, f)
		}
	}
	// now copy over the rest of the fields
	for _, f := range longFrame.Fields {
		if f.Name == logColumnTime {
			// skip because time already copied above. does not skip message because we want it
			// included twice since otherwise it won't be available as a detected field
			continue
		} else if f.Name == logColumnLevel {
			f.Name = "level"
		}
		logFrame.Fields = append(logFrame.Fields, f)
	}
	return logFrame, nil
}
