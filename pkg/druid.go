package main

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/bitly/go-simplejson"
	"github.com/grafadruid/go-druid"
	druidquerybuilder "github.com/grafadruid/go-druid/builder"
	druidquery "github.com/grafadruid/go-druid/builder/query"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
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
	varFrom         = variableVariants("__from")
	varTo           = variableVariants("__to")
	varFromDateISO  = variableVariants("__from:date:iso")
	varToDateISO    = variableVariants("__to:date:iso")
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
	Builder  map[string]any `json:"builder"`
	Settings map[string]any `json:"settings"`
	Expr     string         `json:"expr,omitempty"` // Workaround for Grafana issue #30013 - contains converted query with timezone-aware granularity
}

type druidResponse struct {
	Reference string
	Columns   []struct {
		Name string
		Type string
	}
	Rows [][]any
}

type druidInstanceSettings struct {
	client               *druid.Client
	defaultQuerySettings map[string]any
	druidURL             string
	basicAuthUser        string
	basicAuthPassword    string
	hasBasicAuth         bool
}

func (s *druidInstanceSettings) Dispose() {
	s.client.Close()
}

func newDataSourceInstance(ctx context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
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
	var basicAuthUser string
	var basicAuthPassword string
	var hasBasicAuth bool
	if basicAuth := data.Get("connection.basicAuth").MustBool(); basicAuth {
		basicAuthUser = data.Get("connection.basicAuthUser").MustString()
		basicAuthPassword = secureData["connection.basicAuthPassword"]
		hasBasicAuth = true
		druidOpts = append(druidOpts, druid.WithBasicAuth(basicAuthUser, basicAuthPassword))
	}
	if mTLS := data.Get("connection.mTLS").MustBool(); mTLS {
		log.DefaultLogger.Info("mTLS enabled for Druid connection")

		cert, ok := secureData["connection.mTLSCert"]
		if !ok || cert == "" {
			return &druidInstanceSettings{}, fmt.Errorf("mTLS certificate is required but not provided")
		}
		key, ok := secureData["connection.mTLSKey"]
		if !ok || key == "" {
			return &druidInstanceSettings{}, fmt.Errorf("mTLS key is required but not provided")
		}
		ca, hasCA := secureData["connection.mTLSCa"]

		useSystemCAPool := data.Get("connection.mTLSUseSystemCaPool").MustBool()
		if useSystemCAPool {
			log.DefaultLogger.Info("Using system CA pool for Druid mTLS connection")
		} else {
			log.DefaultLogger.Info("Using custom CA for Druid mTLS connection")
		}

		clientCert, err := tls.X509KeyPair([]byte(cert), []byte(key))
		if err != nil {
			return &druidInstanceSettings{}, fmt.Errorf("failed to load client certificate and key: %w", err)
		}

		caCertPool := x509.NewCertPool()
		if useSystemCAPool {
			caCertPool, err = x509.SystemCertPool()
			if err != nil {
				return &druidInstanceSettings{}, fmt.Errorf("failed to load system CA pool: %w", err)
			}
		}

		if hasCA && !caCertPool.AppendCertsFromPEM([]byte(ca)) {
			return &druidInstanceSettings{}, fmt.Errorf("failed to append CA certificate: %s", ca)
		}

		tlsConfig := &tls.Config{
			Certificates: []tls.Certificate{clientCert},
			RootCAs:      caCertPool,
		}

		httpClient := http.Client{}

		if httpClient.Transport == nil {
			httpClient.Transport = &http.Transport{}
		}

		transport, ok := httpClient.Transport.(*http.Transport)
		if !ok {
			return &druidInstanceSettings{}, fmt.Errorf("http transport is not of type *http.Transport")
		}

		transport.TLSClientConfig = tlsConfig
		druidOpts = append(druidOpts, druid.WithHTTPClient(&httpClient))
	}

	if skipTLS := data.Get("connection.skipTls").MustBool(); skipTLS {
		druidOpts = append(druidOpts, druid.WithSkipTLSVerify())
	}

	druidURL := data.Get("connection.url").MustString()
	c, err := druid.NewClient(druidURL, druidOpts...)
	if err != nil {
		return &druidInstanceSettings{}, err
	}

	return &druidInstanceSettings{
		client:               c,
		defaultQuerySettings: prepareQuerySettings(settings.JSONData),
		druidURL:             druidURL,
		basicAuthUser:        basicAuthUser,
		basicAuthPassword:    basicAuthPassword,
		hasBasicAuth:         hasBasicAuth,
	}, nil
}

func prepareQuerySettings(data json.RawMessage) map[string]any {
	var d map[string]any
	settings := make(map[string]any)
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

func mergeSettings(settings ...map[string]any) map[string]any {
	stg := make(map[string]any)
	for _, s := range settings {
		for k, v := range s {
			stg[k] = v
		}
	}
	return stg
}

// cellToString converts a Druid response cell (interface{}) to string. Druid/JSON can return numbers as float64.
func cellToString(v any) string {
	if v == nil {
		return ""
	}
	switch x := v.(type) {
	case string:
		return x
	case float64:
		return strconv.FormatFloat(x, 'f', -1, 64)
	case int:
		return strconv.Itoa(x)
	case int64:
		return strconv.FormatInt(x, 10)
	case bool:
		return strconv.FormatBool(x)
	default:
		return fmt.Sprintf("%v", v)
	}
}

// cellToFloat64 converts a cell to float64 (Druid often returns numbers as float64; JSON may give int).
func cellToFloat64(v any) float64 {
	if v == nil {
		return 0
	}
	switch x := v.(type) {
	case float64:
		return x
	case int:
		return float64(x)
	case int64:
		return float64(x)
	case string:
		f, _ := strconv.ParseFloat(x, 64)
		return f
	default:
		return 0
	}
}

// cellToInt64 converts a cell to int64 (value may be string, float64, or int from JSON).
func cellToInt64(v any) int64 {
	if v == nil {
		return 0
	}
	switch x := v.(type) {
	case float64:
		return int64(x)
	case int:
		return int64(x)
	case int64:
		return x
	case string:
		i, _ := strconv.ParseInt(x, 10, 64)
		return i
	default:
		return 0
	}
}

func newDatasource(ctx context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	inst, err := newDataSourceInstance(ctx, settings)
	if err != nil {
		return nil, err
	}

	return &druidDatasource{
		settings: inst.(*druidInstanceSettings),
	}, nil
}

type druidDatasource struct {
	settings *druidInstanceSettings
}

func (ds *druidDatasource) Dispose() {
	ds.settings.Dispose()
}

func (ds *druidDatasource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {
	var err error
	var body any
	var code int
	body = "Unknown error"
	code = 500
	switch req.Path {
	case "query-variable":
		switch req.Method {
		case "POST":
			var variableBody []grafanaMetricFindValue
			variableBody, err = ds.QueryVariableData(ctx, req)
			if err == nil {
				code = 200
				body = variableBody
			} else {
				log.DefaultLogger.Error("query-variable failed", "error", err.Error())
				body = map[string]string{"error": err.Error()}
			}
		default:
			body = "Method not supported"
		}
	case "datasource-metadata":
		switch req.Method {
		case "GET":
			body, err = ds.GetDatasourceMetadata(ctx, req)
			if err == nil {
				code = 200
			} else {
				code = 500
				body = map[string]string{"error": err.Error()}
			}
		default:
			body = "Method not supported"
		}
	case "datasources":
		switch req.Method {
		case "GET":
			body, err = ds.ListDatasources(ctx)
			if err == nil {
				code = 200
			} else {
				code = 500
				body = map[string]string{"error": err.Error()}
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
	Value any    `json:"value"`
	Text  string `json:"text"`
}

func (ds *druidDatasource) GetDatasourceMetadata(ctx context.Context, req *backend.CallResourceRequest) (map[string]any, error) {
	// Parse datasource name from query parameters
	// req.URL is a string, so we need to parse it first
	parsedURL, err := url.Parse(req.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse request URL: %w", err)
	}
	datasourceName := parsedURL.Query().Get("datasource")
	if datasourceName == "" {
		return nil, fmt.Errorf("datasource parameter is required")
	}

	// Construct the URL for the Druid metadata API
	url := strings.TrimSuffix(ds.settings.druidURL, "/") + "/druid/v2/datasources/" + datasourceName

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Create HTTP client with authentication if configured
	httpClient := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Add basic auth if configured
	if ds.settings.hasBasicAuth {
		httpReq.SetBasicAuth(ds.settings.basicAuthUser, ds.settings.basicAuthPassword)
	}

	// Make the request
	resp, err := httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch datasource metadata: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Druid API returned status %d", resp.StatusCode)
	}

	// Parse the response
	var metadata map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&metadata); err != nil {
		return nil, fmt.Errorf("failed to parse metadata response: %w", err)
	}

	return metadata, nil
}

func (ds *druidDatasource) ListDatasources(ctx context.Context) ([]string, error) {
	// Construct the URL for the Druid metadata API to list all datasources
	url := strings.TrimSuffix(ds.settings.druidURL, "/") + "/druid/v2/datasources"

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Create HTTP client with authentication if configured
	httpClient := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Add basic auth if configured
	if ds.settings.hasBasicAuth {
		httpReq.SetBasicAuth(ds.settings.basicAuthUser, ds.settings.basicAuthPassword)
	}

	// Make the request
	resp, err := httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch datasources list: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Druid API returned status %d", resp.StatusCode)
	}

	// Parse the response - /druid/v2/datasources returns a JSON array of datasource names
	var datasources []string
	if err := json.NewDecoder(resp.Body).Decode(&datasources); err != nil {
		return nil, fmt.Errorf("failed to parse datasources response: %w", err)
	}

	return datasources, nil
}

func (ds *druidDatasource) QueryVariableData(ctx context.Context, req *backend.CallResourceRequest) ([]grafanaMetricFindValue, error) {
	log.DefaultLogger.Debug("QUERY VARIABLE", "request", string(req.Body))
	return ds.queryVariable(req.Body, ds.settings)
}

func (ds *druidDatasource) queryVariable(qry []byte, s *druidInstanceSettings) ([]grafanaMetricFindValue, error) {
	log.DefaultLogger.Debug("DRUID EXECUTE QUERY VARIABLE", "grafana_query", string(qry))
	// feature: probably implement a short (1s ? 500ms ? configurable in datasource ? beware memory: constrain size ?) life cache (druidInstanceSettings.cache ?) and early return then
	response := []grafanaMetricFindValue{}
	q, stg, err := ds.prepareQuery(qry, s)
	if err != nil {
		return response, err
	}
	if q == nil {
		// prepareQuery returned nil (invalid query), return empty response
		return response, nil
	}
	log.DefaultLogger.Debug("DRUID EXECUTE QUERY VARIABLE", "druid_query", q)
	r, err := ds.executeQuery("variable", q, s, stg)
	if err != nil {
		return response, err
	}
	log.DefaultLogger.Debug("DRUID EXECUTE QUERY VARIABLE", "druid_response", r)
	response, err = ds.prepareVariableResponse(r, stg)
	log.DefaultLogger.Debug("DRUID EXECUTE QUERY VARIABLE", "grafana_response", response)
	return response, err
}

func (ds *druidDatasource) prepareVariableResponse(resp *druidResponse, settings map[string]any) ([]grafanaMetricFindValue, error) {
	// refactor: probably some method that returns a container (make([]whattypeever, 0)) and its related appender func based on column type)
	response := []grafanaMetricFindValue{}
	for ic, c := range resp.Columns {
		for _, r := range resp.Rows {
			switch c.Type {
			case "string":
				if r[ic] != nil {
					s := cellToString(r[ic])
					response = append(response, grafanaMetricFindValue{Value: s, Text: s})
				}
			case "float":
				if r[ic] != nil {
					f := cellToFloat64(r[ic])
					response = append(response, grafanaMetricFindValue{Value: f, Text: fmt.Sprintf("%f", f)})
				}
			case "int":
				if r[ic] != nil {
					i := cellToInt64(r[ic])
					response = append(response, grafanaMetricFindValue{Value: i, Text: strconv.FormatInt(i, 10)})
				}
			case "bool":
				var b bool
				b, ok := r[ic].(bool)
				if !ok {
					b, _ = strconv.ParseBool(cellToString(r[ic]))
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
					t, err = parseTime(r[ic].(string))
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

	status, _, err := ds.settings.client.Common().Status()
	if err != nil {
		result.Message = "Can't fetch Druid status: " + err.Error()
		return result, nil
	}

	result.Status = backend.HealthStatusOk
	result.Message = fmt.Sprintf("Succesfully connected to Druid %s", status.Version)
	return result, nil
}

func (ds *druidDatasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	response := backend.NewQueryDataResponse()

	for _, q := range req.Queries {
		response.Responses[q.RefID] = ds.query(q, ds.settings)
	}

	return response, nil
}

func (ds *druidDatasource) query(qry backend.DataQuery, s *druidInstanceSettings) backend.DataResponse {
	log.DefaultLogger.Debug("DRUID EXECUTE QUERY", "grafana_query", qry)
	rawQuery := interpolateVariables(string(qry.JSON), qry.Interval, qry.TimeRange)

	// feature: probably implement a short (1s ? 500ms ? configurable in datasource ? beware memory: constrain size ?) life cache (druidInstanceSettings.cache ?) and early return then
	response := backend.DataResponse{}
	q, stg, err := ds.prepareQuery([]byte(rawQuery), s)
	if err != nil {
		response.Error = err
		return response
	}
	if q == nil {
		// Check if this is a raw JSON query (period granularity)
		if rawJSON, ok := stg["_rawQueryJSON"].(string); ok {
			// Remove the marker from settings
			delete(stg, "_rawQueryJSON")
			log.DefaultLogger.Debug("DRUID EXECUTE QUERY", "druid_query", rawJSON)
			// Send raw JSON directly to Druid for period granularity queries
			r, err := ds.executeRawQuery(qry.RefID, []byte(rawJSON), s, stg)
			if err != nil {
				response.Error = err
				return response
			}
			log.DefaultLogger.Debug("DRUID EXECUTE QUERY", "druid_response", r)
			response, err = ds.prepareResponse(r, stg)
			if err != nil {
				response.Error = err
			}
			log.DefaultLogger.Debug("DRUID EXECUTE QUERY", "grafana_response", response)
			return response
		}
		// prepareQuery returned nil (invalid query), return empty response
		return response
	}
	log.DefaultLogger.Debug("DRUID EXECUTE QUERY", "druid_query", q)
	r, err := ds.executeQuery(qry.RefID, q, s, stg)
	if err != nil {
		response.Error = err
		return response
	}
	log.DefaultLogger.Debug("DRUID EXECUTE QUERY", "druid_response", r)
	response, err = ds.prepareResponse(r, stg)
	if err != nil {
		// note: error could be set from prepareResponse but this gives a chance to react to error here
		response.Error = err
	}
	log.DefaultLogger.Debug("DRUID EXECUTE QUERY", "grafana_response", response)
	return response
}

func interpolateVariables(expr string, interval time.Duration, timeRange backend.TimeRange) string {
	duration := timeRange.Duration()
	rangeMs := duration.Milliseconds()
	rangeSRounded := int64(math.Round(float64(rangeMs) / 1000.0))

	fromMs := timeRange.From.UnixMilli()
	toMs := timeRange.To.UnixMilli()

	// Format timestamps for ISO format
	fromISO := timeRange.From.Format("2006-01-02T15:04:05.000Z")
	toISO := timeRange.To.Format("2006-01-02T15:04:05.000Z")

	expr = multiReplace(expr, varIntervalMs, strconv.FormatInt(int64(interval/time.Millisecond), 10))
	expr = multiReplace(expr, varInterval, formatDuration(interval))
	expr = multiReplace(expr, varRangeMs, strconv.FormatInt(rangeMs, 10))
	expr = multiReplace(expr, varRangeS, strconv.FormatInt(rangeSRounded, 10))
	expr = multiReplace(expr, varRange, strconv.FormatInt(rangeSRounded, 10)+"s")
	expr = multiReplace(expr, varRateInterval, interval.String())
	expr = multiReplace(expr, varFromDateISO, fromISO)
	expr = multiReplace(expr, varToDateISO, toISO)
	expr = multiReplace(expr, varFrom, strconv.FormatInt(fromMs, 10))
	expr = multiReplace(expr, varTo, strconv.FormatInt(toMs, 10))

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

// extractHiddenMetricsAndStripFromBuilder collects names of aggregations marked hidden
// and removes the "hidden" key from each aggregation so the query sent to Druid is valid.
// Returns the list of hidden metric names for use when building the response frame.
func extractHiddenMetricsAndStripFromBuilder(builder map[string]any) []string {
	if builder == nil {
		return nil
	}
	aggs, ok := builder["aggregations"].([]any)
	if !ok || len(aggs) == 0 {
		return nil
	}
	var hidden []string
	for _, a := range aggs {
		m, ok := a.(map[string]any)
		if !ok {
			continue
		}
		if h, _ := m["hidden"].(bool); h {
			if name, _ := m["name"].(string); name != "" {
				hidden = append(hidden, name)
			}
		}
		delete(m, "hidden")
	}
	return hidden
}

// extractGroupBySeriesOpts extracts dimension and metric names from a groupBy query builder
// for use when building "groupName:metric" series (old plugin compatibility). Returns
// dimension names (as they appear in the response event), metric names, and true if this is groupBy.
func extractGroupBySeriesOpts(builder map[string]any) (dimensions []string, metrics []string, ok bool) {
	if builder == nil {
		return nil, nil, false
	}
	if qt, _ := builder["queryType"].(string); qt != "groupBy" {
		return nil, nil, false
	}
	// Dimensions: string = dimension name; object may have "outputName" or "dimension"
	if dims, _ := builder["dimensions"].([]any); dims != nil {
		for _, d := range dims {
			switch v := d.(type) {
			case string:
				if v != "" {
					dimensions = append(dimensions, v)
				}
			case map[string]any:
				if name, _ := v["outputName"].(string); name != "" {
					dimensions = append(dimensions, name)
				} else if name, _ := v["dimension"].(string); name != "" {
					dimensions = append(dimensions, name)
				}
			}
		}
	}
	// Metrics: aggregation "name" (excluding hidden)
	hidden := make(map[string]bool)
	for _, s := range extractHiddenMetricsAndStripFromBuilder(builder) {
		hidden[s] = true
	}
	if aggs, _ := builder["aggregations"].([]any); aggs != nil {
		for _, a := range aggs {
			m, _ := a.(map[string]any)
			if m == nil {
				continue
			}
			name, _ := m["name"].(string)
			if name != "" && !hidden[name] {
				metrics = append(metrics, name)
			}
		}
	}
	return dimensions, metrics, len(dimensions) > 0 && len(metrics) > 0
}

// expandJsonFiltersInBuilder walks the builder's filter tree and replaces any filter
// with type "json" by parsing filter.value as JSON. Template variables (e.g. $variable_name)
// are already replaced by Grafana before the query reaches the backend.
func expandJsonFiltersInBuilder(builder map[string]any) {
	if builder == nil {
		return
	}
	filter, ok := builder["filter"]
	if !ok || filter == nil {
		return
	}
	builder["filter"] = expandJsonFilters(filter)
}

// expandJsonFilters recursively expands the filter tree. Filters with type "json" are
// replaced by the parsed JSON object (filter.value). "and" and "or" filters have their
// fields expanded; "not" has its field expanded.
func expandJsonFilters(filter any) any {
	if filter == nil {
		return nil
	}
	f, ok := filter.(map[string]any)
	if !ok {
		return filter
	}
	ftype, _ := f["type"].(string)
	switch ftype {
	case "json":
		val := f["value"]
		if val == nil {
			return filter
		}
		var valueStr string
		switch v := val.(type) {
		case string:
			valueStr = v
		default:
			// Try to marshal and unmarshal if value was already expanded to a map
			if alreadyExpanded, ok := val.(map[string]any); ok {
				return alreadyExpanded
			}
			return filter
		}
		valueStr = strings.TrimSpace(valueStr)
		if valueStr == "" {
			return filter
		}
		var parsed map[string]any
		if err := json.Unmarshal([]byte(valueStr), &parsed); err != nil {
			log.DefaultLogger.Debug("Failed to parse json filter value", "error:", err, "value:", valueStr)
			return filter
		}
		return parsed
	case "and", "or":
		fields, ok := f["fields"].([]any)
		if !ok || len(fields) == 0 {
			return filter
		}
		expanded := make([]any, len(fields))
		for i, field := range fields {
			expanded[i] = expandJsonFilters(field)
		}
		out := make(map[string]any, len(f))
		for k, v := range f {
			out[k] = v
		}
		out["fields"] = expanded
		return out
	case "not":
		field := f["field"]
		if field == nil {
			return filter
		}
		out := make(map[string]any, len(f))
		for k, v := range f {
			out[k] = v
		}
		out["field"] = expandJsonFilters(field)
		return out
	default:
		return filter
	}
}

func (ds *druidDatasource) prepareQuery(qry []byte, s *druidInstanceSettings) (druidquerybuilder.Query, map[string]any, error) {
	var q druidQuery
	err := json.Unmarshal(qry, &q)
	if err != nil {
		return nil, nil, err
	}

	// Use expr if available (contains converted query with timezone-aware granularity)
	// Otherwise fall back to builder/settings
	var builder map[string]any
	var settings map[string]any

	if q.Expr != "" {
		// Parse the expr JSON string which contains { builder: {...}, settings: {...} }
		var exprQuery druidQuery
		err := json.Unmarshal([]byte(q.Expr), &exprQuery)
		if err != nil {
			log.DefaultLogger.Debug("Failed to parse expr, falling back to builder", "error:", err, "expr:", q.Expr)
			// Fall back to builder/settings if expr parsing fails
			builder = q.Builder
			settings = q.Settings
		} else {
			builder = exprQuery.Builder
			settings = exprQuery.Settings
			// Merge with original settings if expr doesn't have settings
			if settings == nil {
				settings = q.Settings
			}
		}
	} else {
		builder = q.Builder
		settings = q.Settings
	}

	if builder == nil || settings == nil {
		// Don't return an error here, as this isn't a user error
		// Grafana seems to invoke this even before the user has entered any query
		log.DefaultLogger.Debug("Invalid query issued to Druid Plugin: missing builder or settings", "query:", string(qry))
		return nil, nil, nil
	}

	// Expand json filters: replace filter type "json" with parsed value (template variables already replaced by Grafana)
	expandJsonFiltersInBuilder(builder)

	// Extract hidden aggregation names for response filtering and strip "hidden" from builder so Druid query is valid
	if hiddenNames := extractHiddenMetricsAndStripFromBuilder(builder); len(hiddenNames) > 0 {
		hiddenNamesAny := make([]any, len(hiddenNames))
		for i, s := range hiddenNames {
			hiddenNamesAny[i] = s
		}
		settings["_hiddenMetricNames"] = hiddenNamesAny
	}
	// Extract groupBy dimensions and metrics for "groupName:metric" series
	if dims, metrics, ok := extractGroupBySeriesOpts(builder); ok {
		dimsAny := make([]any, len(dims))
		for i, s := range dims {
			dimsAny[i] = s
		}
		metricsAny := make([]any, len(metrics))
		for i, s := range metrics {
			metricsAny[i] = s
		}
		settings["_groupByDimensions"] = dimsAny
		settings["_groupByMetrics"] = metricsAny
	}
	// Extract topN dimension and metric for series-style response (stacked charts, old plugin compatibility)
	if qt, _ := builder["queryType"].(string); qt == "topN" {
		if dim, ok := builder["dimension"].(map[string]any); ok {
			if d, ok := dim["dimension"].(string); ok {
				settings["_topNDimension"] = d
			}
		}
		if met, ok := builder["metric"].(map[string]any); ok {
			if m, ok := met["metric"].(string); ok {
				settings["_topNMetric"] = m
			}
		}
	}

	var defaultQueryContext map[string]any
	if defaultContextParameters, ok := s.defaultQuerySettings["contextParameters"]; ok {
		defaultQueryContext = ds.prepareQueryContext(defaultContextParameters.([]any))
	}
	builder["context"] = defaultQueryContext
	if queryContextParameters, ok := settings["contextParameters"]; ok {
		builder["context"] = mergeSettings(
			defaultQueryContext,
			ds.prepareQueryContext(queryContextParameters.([]any)))
	}
	// Check if granularity is a period type (which the Go client can't handle properly)
	// Period granularity uses ISO8601 strings like "P1D" which can't be unmarshaled into time.Duration
	hasPeriodGranularity := false
	if granularity, ok := builder["granularity"].(map[string]any); ok {
		if gtype, ok := granularity["type"].(string); ok && gtype == "period" {
			hasPeriodGranularity = true
		}
	}

	jsonQuery, err := json.Marshal(builder)
	if err != nil {
		return nil, nil, err
	}

	// If we have period granularity, we need to send raw JSON directly to Druid
	// because the Go client's Load method expects time.Duration for period, not ISO8601 strings
	if hasPeriodGranularity {
		// Create a raw query wrapper that will be handled specially in executeQuery
		// We'll return nil for the query and store the raw JSON in settings as a marker
		settings["_rawQueryJSON"] = string(jsonQuery)
		return nil, mergeSettings(s.defaultQuerySettings, settings), nil
	}

	query, err := s.client.Query().Load(jsonQuery)
	// feature: could ensure __time column is selected, time interval is set based on qry given timerange and consider max data points ?
	return query, mergeSettings(s.defaultQuerySettings, settings), err
}

func (ds *druidDatasource) prepareQueryContext(parameters []any) map[string]any {
	ctx := make(map[string]any)
	if parameters != nil {
		for _, parameter := range parameters {
			p := parameter.(map[string]any)
			ctx[p["name"].(string)] = p["value"]
		}
	}
	return ctx
}

// executeRawQuery sends raw JSON query directly to Druid, bypassing the Go client's struct unmarshaling
// This is needed for period granularity queries which use ISO8601 strings that can't be unmarshaled into time.Duration
func (ds *druidDatasource) executeRawQuery(queryRef string, jsonQuery []byte, s *druidInstanceSettings, settings map[string]any) (*druidResponse, error) {
	r := &druidResponse{Reference: queryRef}

	// Determine query type from JSON to handle result format
	var queryType string
	var queryMap map[string]any
	if err := json.Unmarshal(jsonQuery, &queryMap); err == nil {
		if qt, ok := queryMap["queryType"].(string); ok {
			queryType = qt
		}
	}

	// Send raw JSON query directly to Druid
	url := strings.TrimSuffix(s.druidURL, "/") + "/druid/v2/"
	httpReq, err := http.NewRequest("POST", url, strings.NewReader(string(jsonQuery)))
	if err != nil {
		return r, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	// Add authentication if configured
	if s.hasBasicAuth {
		httpReq.SetBasicAuth(s.basicAuthUser, s.basicAuthPassword)
	}

	httpClient := &http.Client{Timeout: 300 * time.Second}
	resp, err := httpClient.Do(httpReq)
	if err != nil {
		return r, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := json.Marshal(map[string]any{"error": fmt.Sprintf("Druid returned status %d", resp.StatusCode)})
		return r, fmt.Errorf("druid query failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result json.RawMessage
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return r, err
	}

	// Process the result similar to executeQuery
	election := func(values map[string]int) string {
		type kv struct {
			Key   string
			Value int
		}
		var ss []kv
		for k, v := range values {
			if k == "nil" {
				continue
			}
			ss = append(ss, kv{k, v})
		}
		sort.Slice(ss, func(i, j int) bool {
			return ss[i].Value > ss[j].Value
		})
		if len(ss) > 0 {
			return ss[0].Key
		}
		if queryType == "segmentMetadata" {
			return "string"
		}
		return "float"
	}

	detectColumnType := func(c *struct {
		Name string
		Type string
	}, pos int, rr [][]any,
	) {
		t := map[string]int{"nil": 0}
		for i := 0; i < len(rr); i += int(math.Ceil(float64(len(rr)) / 5.0)) {
			r := rr[i]
			if r[pos] == nil {
				continue
			}
			switch r[pos].(type) {
			case string:
				v := r[pos].(string)
				_, err := strconv.Atoi(v)
				if err != nil {
					_, err := strconv.ParseBool(v)
					if err != nil {
						_, err := parseTime(v)
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
		c.Type = election(t)
	}

	switch queryType {
	case "sql":
		var sqlr []any
		err := json.Unmarshal(result, &sqlr)
		if err == nil && len(sqlr) > 1 {
			for _, row := range sqlr[1:] {
				r.Rows = append(r.Rows, row.([]any))
			}
			for i, c := range sqlr[0].([]any) {
				col := struct {
					Name string
					Type string
				}{Name: c.(string)}
				detectColumnType(&col, i, r.Rows)
				r.Columns = append(r.Columns, col)
			}
		}
	case "timeseries":
		var tsr []map[string]any
		err := json.Unmarshal(result, &tsr)
		if err == nil && len(tsr) > 0 {
			columns := []string{"timestamp"}
			for c := range tsr[0]["result"].(map[string]any) {
				columns = append(columns, c)
			}
			for _, result := range tsr {
				var row []any
				t := result["timestamp"]
				if t == nil {
					// grand total, lets keep it last
					if len(r.Rows) > 0 {
						t = r.Rows[len(r.Rows)-1][0]
					}
				}
				row = append(row, t)
				colResults := result["result"].(map[string]any)
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
		var tn []map[string]any
		err := json.Unmarshal(result, &tn)
		if err == nil && len(tn) > 0 {
			columns := []string{"timestamp"}
			// Derive dimension/metric columns from the first bucket that has a non-empty result
			for _, bucket := range tn {
				if colResults, ok := asResultSlice(bucket["result"]); ok && len(colResults) > 0 {
					for c := range colResults[0] {
						columns = append(columns, c)
					}
					break
				}
			}
			for _, result := range tn {
				t := result["timestamp"]
				if colResults, ok := asResultSlice(result["result"]); ok && len(colResults) > 0 {
					for _, entry := range colResults {
						var row []any
						row = append(row, t)
						for _, c := range columns[1:] {
							row = append(row, entry[c])
						}
						r.Rows = append(r.Rows, row)
					}
				} else {
					// Empty bucket: one row with timestamp and nils
					row := []any{t}
					for len(row) < len(columns) {
						row = append(row, nil)
					}
					r.Rows = append(r.Rows, row)
				}
			}
			// Fill missing dimension values per timestamp (for stacked charts, old plugin compatibility)
			fillTopNMissingDimensionValues(&r.Rows, columns, settings)
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
		var gb []map[string]any
		err := json.Unmarshal(result, &gb)
		if err == nil && len(gb) > 0 {
			columns := []string{"timestamp"}
			for c := range gb[0]["event"].(map[string]any) {
				columns = append(columns, c)
			}
			for _, result := range gb {
				var row []any
				t := result["timestamp"]
				row = append(row, t)
				colResults := result["event"].(map[string]any)
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
		var scanr []map[string]any
		err := json.Unmarshal(result, &scanr)
		if err == nil && len(scanr) > 0 {
			columns := []string{}
			for c := range scanr[0]["events"].([]map[string]any)[0] {
				columns = append(columns, c)
			}
			for _, result := range scanr {
				colResults := result["events"].([]map[string]any)
				for _, event := range colResults {
					var row []any
					for _, c := range columns {
						row = append(row, event[c])
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
		var tb []map[string]any
		err := json.Unmarshal(result, &tb)
		if err == nil && len(tb) > 0 {
			columns := []string{"minTime", "maxTime"}
			for _, result := range tb {
				var row []any
				for _, c := range columns {
					row = append(row, result[c])
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
	case "datasourceMetadata":
		var dsm []map[string]any
		err := json.Unmarshal(result, &dsm)
		if err == nil && len(dsm) > 0 {
			columns := []string{}
			for c := range dsm[0] {
				columns = append(columns, c)
			}
			for _, result := range dsm {
				var row []any
				for _, c := range columns {
					row = append(row, result[c])
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
		var sm []map[string]any
		err := json.Unmarshal(result, &sm)
		if err == nil && len(sm) > 0 {
			columns := []string{}
			for c := range sm[0] {
				columns = append(columns, c)
			}
			for _, result := range sm {
				var row []any
				for _, c := range columns {
					row = append(row, result[c])
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
	case "search":
		var s []map[string]any
		err := json.Unmarshal(result, &s)
		if err == nil && len(s) > 0 {
			colResults0, _ := s[0]["result"].([]map[string]any)
			if len(colResults0) > 0 {
				columns := []string{"timestamp"}
				for c := range colResults0[0] {
					columns = append(columns, c)
				}
				for _, result := range s {
					var row []any
					t := result["timestamp"]
					row = append(row, t)
					colResults := result["result"].([]map[string]any)
					if len(colResults) > 0 {
						for _, c := range columns[1:] {
							row = append(row, colResults[0][c])
						}
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
			// empty result array: r stays with zero Rows/Columns, return success
		}
	default:
		// For unknown query types, try to parse as generic JSON
		var genericResult []map[string]any
		if err := json.Unmarshal(result, &genericResult); err == nil && len(genericResult) > 0 {
			columns := []string{}
			for c := range genericResult[0] {
				columns = append(columns, c)
			}
			for _, rowData := range genericResult {
				var row []any
				for _, c := range columns {
					row = append(row, rowData[c])
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
	}

	return r, nil
}

func (ds *druidDatasource) executeQuery(queryRef string, q druidquerybuilder.Query, s *druidInstanceSettings, settings map[string]any) (*druidResponse, error) {
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
	}, pos int, rr [][]any,
	) {
		t := map[string]int{"nil": 0}
		for i := 0; i < len(rr); i += int(math.Ceil(float64(len(rr)) / 5.0)) {
			r := rr[i]
			if r[pos] == nil {
				continue
			}
			switch r[pos].(type) {
			case string:
				v := r[pos].(string)
				_, err := strconv.Atoi(v)
				if err != nil {
					_, err := strconv.ParseBool(v)
					if err != nil {
						_, err := parseTime(v)
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
				if k == "nil" {
					continue
				}
				ss = append(ss, kv{k, v})
			}
			sort.Slice(ss, func(i, j int) bool {
				return ss[i].Value > ss[j].Value
			})
			if len(ss) > 0 {
				return ss[0].Key
			}
			// For segmentMetadata, all-nil columns are often unused analysis fields; default to string. Others stay float.
			if qtyp == "segmentMetadata" {
				return "string"
			}
			return "float"
		}
		c.Type = election(t)
	}
	switch qtyp {
	case "sql":
		var sqlr []any
		err := json.Unmarshal(result, &sqlr)
		if err == nil && len(sqlr) > 1 {
			for _, row := range sqlr[1:] {
				r.Rows = append(r.Rows, row.([]any))
			}
			for i, c := range sqlr[0].([]any) {
				col := struct {
					Name string
					Type string
				}{Name: c.(string)}
				detectColumnType(&col, i, r.Rows)
				r.Columns = append(r.Columns, col)
			}
		}
	case "timeseries":
		var tsr []map[string]any
		err := json.Unmarshal(result, &tsr)
		if err == nil && len(tsr) > 0 {
			columns := []string{"timestamp"}
			for c := range tsr[0]["result"].(map[string]any) {
				columns = append(columns, c)
			}
			for _, result := range tsr {
				var row []any
				t := result["timestamp"]
				if t == nil {
					// grand total, lets keep it last
					t = r.Rows[len(r.Rows)-1][0]
				}
				row = append(row, t)
				colResults := result["result"].(map[string]any)
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
		var tn []map[string]any
		err := json.Unmarshal(result, &tn)
		if err == nil && len(tn) > 0 {
			columns := []string{"timestamp"}
			for _, bucket := range tn {
				if colResults, ok := asResultSlice(bucket["result"]); ok && len(colResults) > 0 {
					if len(columns) == 1 {
						for c := range colResults[0] {
							columns = append(columns, c)
						}
					}
					break
				}
			}
			for _, result := range tn {
				t := result["timestamp"]
				if colResults, ok := asResultSlice(result["result"]); ok && len(colResults) > 0 {
					for _, entry := range colResults {
						var row []any
						row = append(row, t)
						for _, c := range columns[1:] {
							row = append(row, entry[c])
						}
						r.Rows = append(r.Rows, row)
					}
				} else {
					row := []any{t}
					for len(row) < len(columns) {
						row = append(row, nil)
					}
					r.Rows = append(r.Rows, row)
				}
			}
			fillTopNMissingDimensionValues(&r.Rows, columns, settings)
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
		var gb []map[string]any
		err := json.Unmarshal(result, &gb)
		if err == nil && len(gb) > 0 {
			columns := []string{"timestamp"}
			for c := range gb[0]["event"].(map[string]any) {
				columns = append(columns, c)
			}
			for _, result := range gb {
				var row []any
				row = append(row, result["timestamp"])
				colResults := result["event"].(map[string]any)
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
		var scanr []map[string]any
		err := json.Unmarshal(result, &scanr)
		if err == nil && len(scanr) > 0 {
			for _, e := range scanr[0]["events"].([]any) {
				r.Rows = append(r.Rows, e.([]any))
			}
			for i, c := range scanr[0]["columns"].([]any) {
				col := struct {
					Name string
					Type string
				}{Name: c.(string)}
				detectColumnType(&col, i, r.Rows)
				r.Columns = append(r.Columns, col)
			}
		}
	case "search":
		var s []map[string]any
		err := json.Unmarshal(result, &s)
		if err == nil && len(s) > 0 {
			resultArr, _ := s[0]["result"].([]any)
			if len(resultArr) > 0 {
				columns := []string{"timestamp"}
				for c := range resultArr[0].(map[string]any) {
					columns = append(columns, c)
				}
				for _, resultItem := range s {
					for _, record := range resultItem["result"].([]any) {
						var row []any
						row = append(row, resultItem["timestamp"])
						o := record.(map[string]any)
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
			// empty result array: r stays with zero Rows/Columns, return success
		}
	case "timeBoundary":
		var tb []map[string]any
		err := json.Unmarshal(result, &tb)
		if err == nil && len(tb) > 0 {
			columns := []string{"timestamp"}
			for c := range tb[0]["result"].(map[string]any) {
				columns = append(columns, c)
			}
			for _, result := range tb {
				var row []any
				row = append(row, result["timestamp"])
				colResults := result["result"].(map[string]any)
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
		var dsm []map[string]any
		err := json.Unmarshal(result, &dsm)
		if err == nil && len(dsm) > 0 {
			columns := []string{"timestamp"}
			for c := range dsm[0]["result"].(map[string]any) {
				columns = append(columns, c)
			}
			for _, result := range dsm {
				var row []any
				row = append(row, result["timestamp"])
				colResults := result["result"].(map[string]any)
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
		var sm []map[string]any
		err := json.Unmarshal(result, &sm)
		if err == nil && len(sm) > 0 {
			var columns []string
			view, _ := settings["view"].(string)
			if view == "" {
				view = "base"
			}
			switch view {
			case "base":
				for k, v := range sm[0] {
					if k != "aggregators" && k != "columns" && k != "timestampSpec" {
						if k == "intervals" {
							if intervals, ok := v.([]any); ok && intervals != nil {
								for i := range intervals {
									pos := strconv.Itoa(i)
									columns = append(columns, "interval_start_"+pos)
									columns = append(columns, "interval_stop_"+pos)
								}
							} else {
								columns = append(columns, k)
							}
						} else {
							columns = append(columns, k)
						}
					}
				}
				for _, result := range sm {
					var row []any
					for _, c := range columns {
						var col any
						if strings.HasPrefix(c, "interval_") {
							parts := strings.Split(c, "_")
							pos := 0
							if parts[1] == "stop" {
								pos = 1
							}
							idx, parseErr := strconv.Atoi(parts[2])
							if parseErr != nil {
								return r, errors.New("interval parsing goes wrong")
							}
							intervals, _ := result["intervals"].([]any)
							if intervals != nil && idx < len(intervals) && intervals[idx] != nil {
								if s, ok := intervals[idx].(string); ok {
									split := strings.Split(s, "/")
									if pos < len(split) {
										col = split[pos]
									}
								}
							}
						} else {
							col = result[c]
						}
						row = append(row, col)
					}
					r.Rows = append(r.Rows, row)
				}
			case "aggregators":
				if aggs, ok := sm[0]["aggregators"].(map[string]any); ok && aggs != nil {
					for _, v := range aggs {
						if vm, ok := v.(map[string]any); ok {
							columns = append(columns, "aggregator")
							for k := range vm {
								columns = append(columns, k)
							}
							break
						}
					}
				}
				for _, result := range sm {
					if aggs, ok := result["aggregators"].(map[string]any); ok && aggs != nil {
						for k, v := range aggs {
							if vm, ok := v.(map[string]any); ok {
								var row []any
								for _, c := range columns {
									var col any
									if c == "aggregator" {
										col = k
									} else {
										col = vm[c]
									}
									row = append(row, col)
								}
								r.Rows = append(r.Rows, row)
							}
						}
					}
				}
			case "columns":
				if cols, ok := sm[0]["columns"].(map[string]any); ok && cols != nil {
					for _, v := range cols {
						if vm, ok := v.(map[string]any); ok {
							columns = append(columns, "column")
							for k := range vm {
								columns = append(columns, k)
							}
							break
						}
					}
				}
				for _, result := range sm {
					if cols, ok := result["columns"].(map[string]any); ok && cols != nil {
						for k, v := range cols {
							if vm, ok := v.(map[string]any); ok {
								var row []any
								for _, c := range columns {
									var col any
									if c == "column" {
										col = k
									} else {
										col = vm[c]
									}
									row = append(row, col)
								}
								r.Rows = append(r.Rows, row)
							}
						}
					}
				}
			case "timestampspec":
				if ts, ok := sm[0]["timestampSpec"].(map[string]any); ok && ts != nil {
					for k := range ts {
						columns = append(columns, k)
					}
				}
				for _, result := range sm {
					if ts, ok := result["timestampSpec"].(map[string]any); ok && ts != nil {
						var row []any
						for _, c := range columns {
							row = append(row, ts[c])
						}
						r.Rows = append(r.Rows, row)
					}
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
	return r, nil
}

// buildGroupBySeriesFrame builds a wide frame with Time + one column per "groupName:metric" series
func buildGroupBySeriesFrame(resp *druidResponse, settings map[string]any) *data.Frame {
	var dims, metrics []string
	for _, d := range asStringSlice(settings["_groupByDimensions"]) {
		dims = append(dims, d)
	}
	for _, m := range asStringSlice(settings["_groupByMetrics"]) {
		metrics = append(metrics, m)
	}
	if len(dims) == 0 || len(metrics) == 0 || len(resp.Rows) == 0 {
		return nil
	}
	colIdx := make(map[string]int)
	for i, c := range resp.Columns {
		colIdx[c.Name] = i
	}
	timeIdx := 0
	if _, ok := colIdx["timestamp"]; ok {
		timeIdx = colIdx["timestamp"]
	}
	dimIndices := make([]int, 0, len(dims))
	for _, d := range dims {
		if i, ok := colIdx[d]; ok {
			dimIndices = append(dimIndices, i)
		}
	}
	metricIndices := make([]int, 0, len(metrics))
	for _, m := range metrics {
		if i, ok := colIdx[m]; ok {
			metricIndices = append(metricIndices, i)
		}
	}
	if len(dimIndices) == 0 || len(metricIndices) == 0 {
		return nil
	}
	// Build (time, seriesName, value) and collect unique times and series for wide format
	type key struct{ t int64; s string }
	points := make(map[key]float64)
	var timeOrder []int64
	timeSeen := make(map[int64]bool)
	var seriesOrder []string
	seriesSeen := make(map[string]bool)
	for _, r := range resp.Rows {
		parts := make([]string, 0, len(dimIndices))
		for _, di := range dimIndices {
			parts = append(parts, cellToString(r[di]))
		}
		groupName := strings.Join(parts, "-")
		if groupName == "" {
			// Skip rows with no dimension values (e.g. empty-bucket placeholder)
			continue
		}
		t := parseRowTime(r[timeIdx])
		ts := t.UnixMilli()
		if !timeSeen[ts] {
			timeSeen[ts] = true
			timeOrder = append(timeOrder, ts)
		}
		for _, mi := range metricIndices {
			metricName := resp.Columns[mi].Name
			s := groupName + ":" + metricName
			if !seriesSeen[s] {
				seriesSeen[s] = true
				seriesOrder = append(seriesOrder, s)
			}
			points[key{t: ts, s: s}] = cellToFloat64(r[mi])
		}
	}
	if len(timeOrder) == 0 || len(seriesOrder) == 0 {
		return nil
	}
	sort.Slice(timeOrder, func(i, j int) bool { return timeOrder[i] < timeOrder[j] })
	// Build wide frame: Time + one column per series
	times := make([]time.Time, len(timeOrder))
	for i, ts := range timeOrder {
		times[i] = time.UnixMilli(ts)
	}
	var zero float64 = 0
	frame := data.NewFrame(resp.Reference, data.NewField("Time", nil, times))
	for _, s := range seriesOrder {
		vals := make([]*float64, len(timeOrder))
		for i, ts := range timeOrder {
			if v, ok := points[key{t: ts, s: s}]; ok {
				vCopy := v
				vals[i] = &vCopy
			} else {
				vals[i] = &zero
			}
		}
		frame.Fields = append(frame.Fields, data.NewField(s, nil, vals))
	}
	return frame
}

// buildTopNSeriesFrame builds a wide frame with Time + one column per dimension value (topN series, old plugin compatibility).
// Uses filled rows (missing dimension values per timestamp already have nil metric) so stacked charts sum correctly.
func buildTopNSeriesFrame(resp *druidResponse, settings map[string]any) *data.Frame {
	dimName, _ := settings["_topNDimension"].(string)
	metricName, _ := settings["_topNMetric"].(string)
	if dimName == "" || metricName == "" || len(resp.Rows) == 0 {
		return nil
	}
	colIdx := make(map[string]int)
	for i, c := range resp.Columns {
		colIdx[c.Name] = i
	}
	timeIdx, hasTime := colIdx["timestamp"]
	dimIdx, hasDim := colIdx[dimName]
	metricIdx, hasMetric := colIdx[metricName]
	if !hasTime || !hasDim || !hasMetric {
		return nil
	}
	type key struct{ t int64; s string }
	points := make(map[key]float64)
	var timeOrder []int64
	timeSeen := make(map[int64]bool)
	var seriesOrder []string
	seriesSeen := make(map[string]bool)
	for _, r := range resp.Rows {
		s := cellToString(r[dimIdx])
		if s == "" {
			// Skip empty-bucket rows (timestamp, nil dimension, nil metric); do not create a series for ""
			continue
		}
		ts := parseRowTime(r[timeIdx]).UnixMilli()
		if !timeSeen[ts] {
			timeSeen[ts] = true
			timeOrder = append(timeOrder, ts)
		}
		if !seriesSeen[s] {
			seriesSeen[s] = true
			seriesOrder = append(seriesOrder, s)
		}
		if r[metricIdx] != nil {
			points[key{t: ts, s: s}] = cellToFloat64(r[metricIdx])
		}
	}
	if len(timeOrder) == 0 || len(seriesOrder) == 0 {
		return nil
	}
	sort.Slice(timeOrder, func(i, j int) bool { return timeOrder[i] < timeOrder[j] })
	times := make([]time.Time, len(timeOrder))
	for i, ts := range timeOrder {
		times[i] = time.UnixMilli(ts)
	}
	var zero float64 = 0
	frame := data.NewFrame(resp.Reference, data.NewField("Time", nil, times))
	for _, s := range seriesOrder {
		vals := make([]*float64, len(timeOrder))
		for i, ts := range timeOrder {
			if v, ok := points[key{t: ts, s: s}]; ok {
				vCopy := v
				vals[i] = &vCopy
			} else {
				vals[i] = &zero
			}
		}
		frame.Fields = append(frame.Fields, data.NewField(s, nil, vals))
	}
	return frame
}

func asStringSlice(v any) []string {
	if v == nil {
		return nil
	}
	if ss, ok := v.([]string); ok {
		return ss
	}
	aa, ok := v.([]any)
	if !ok {
		return nil
	}
	var out []string
	for _, a := range aa {
		if s, ok := a.(string); ok {
			out = append(out, s)
		}
	}
	return out
}

// asResultSlice converts topN "result" (either []map[string]any or []interface{}) to []map[string]any.
func asResultSlice(v any) ([]map[string]any, bool) {
	if v == nil {
		return nil, false
	}
	switch s := v.(type) {
	case []map[string]any:
		return s, true
	case []interface{}:
		out := make([]map[string]any, 0, len(s))
		for _, item := range s {
			if m, ok := item.(map[string]any); ok {
				out = append(out, m)
			}
		}
		return out, true
	}
	return nil, false
}

// fillTopNMissingDimensionValues appends rows for (timestamp, dimension value) pairs that are missing,
// with metric = nil, so stacked charts have a consistent set of series (old plugin compatibility).
func fillTopNMissingDimensionValues(rows *[][]any, columns []string, settings map[string]any) {
	dimName, _ := settings["_topNDimension"].(string)
	metricName, _ := settings["_topNMetric"].(string)
	colIdx := make(map[string]int)
	for i, c := range columns {
		colIdx[c] = i
	}
	if dimName == "" && len(columns) >= 2 {
		dimName = columns[1]
	}
	if metricName == "" && len(columns) >= 3 {
		metricName = columns[2]
	}
	if dimName == "" || metricName == "" {
		return
	}
	dimIdx := colIdx[dimName]
	metricIdx := colIdx[metricName]
	timeIdx := colIdx["timestamp"]
	allDimVals := make([]string, 0)
	seenDim := make(map[string]bool)
	for _, row := range *rows {
		if dimIdx < len(row) && row[dimIdx] != nil {
			s := cellToString(row[dimIdx])
			if s != "" && !seenDim[s] {
				seenDim[s] = true
				allDimVals = append(allDimVals, s)
			}
		}
	}
	type timeDimKey struct{ t int64; d string }
	present := make(map[timeDimKey]bool)
	timeVals := make(map[int64]any)
	for _, row := range *rows {
		if timeIdx >= len(row) {
			continue
		}
		ts := parseRowTime(row[timeIdx]).UnixMilli()
		timeVals[ts] = row[timeIdx]
		present[timeDimKey{ts, cellToString(row[dimIdx])}] = true
	}
	for ts, tVal := range timeVals {
		for _, d := range allDimVals {
			if present[timeDimKey{ts, d}] {
				continue
			}
			present[timeDimKey{ts, d}] = true
			newRow := make([]any, len(columns))
			newRow[timeIdx] = tVal
			newRow[dimIdx] = d
			newRow[metricIdx] = nil
			*rows = append(*rows, newRow)
		}
	}
}

func parseRowTime(v any) time.Time {
	if v == nil {
		return time.Time{}
	}
	switch x := v.(type) {
	case string:
		t, err := parseTime(x)
		if err != nil {
			return time.Now()
		}
		return t
	case float64:
		sec, dec := math.Modf(x / 1000)
		return time.Unix(int64(sec), int64(dec*(1e9)))
	case int64:
		return time.Unix(x/1000, 0)
	case int:
		return time.Unix(int64(x)/1000, 0)
	}
	return time.Time{}
}

func (ds *druidDatasource) prepareResponse(resp *druidResponse, settings map[string]any) (backend.DataResponse, error) {
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
	// Hidden aggregations: still in query and computed by Druid, but not shown as panel series
	hiddenMetricNames := make(map[string]bool)
	if names, ok := settings["_hiddenMetricNames"].([]string); ok {
		for _, s := range names {
			hiddenMetricNames[s] = true
		}
	}
	// JSON-unmarshaled query may have []any for the slice
	if names, ok := settings["_hiddenMetricNames"].([]any); ok {
		for _, n := range names {
			if s, ok := n.(string); ok {
				hiddenMetricNames[s] = true
			}
		}
	}
	// turn druid response into grafana long frame
	if responseLimit > 0 && len(resp.Rows) > int(responseLimit) {
		resp.Rows = resp.Rows[:int(responseLimit)]
		response.Error = fmt.Errorf("query response limit exceeded (> %d rows): consider adding filters and/or reducing the query time range", int(responseLimit))
	}

	// groupBy: build "groupName:metric" series (old plugin compatibility)
	if groupByFrame := buildGroupBySeriesFrame(resp, settings); groupByFrame != nil {
		response.Frames = append(response.Frames, groupByFrame)
		return response, nil
	}
	// topN: build Time + one column per dimension value (stacked charts, old plugin compatibility)
	if topNFrame := buildTopNSeriesFrame(resp, settings); topNFrame != nil {
		response.Frames = append(response.Frames, topNFrame)
		return response, nil
	}

	for ic, c := range resp.Columns {
		if hiddenMetricNames[c.Name] {
			continue
		}
		var ff any
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
				ff = append(ff.([]string), cellToString(r[ic]))
			case "float", "double":
				ff = append(ff.([]float64), cellToFloat64(r[ic]))
			case "int":
				ff = append(ff.([]int64), cellToInt64(r[ic]))
			case "bool":
				var b bool
				b, ok := r[ic].(bool)
				if !ok {
					b, _ = strconv.ParseBool(cellToString(r[ic]))
				}
				ff = append(ff.([]bool), b)
			case "nil":
				ff = append(ff.([]string), "nil")
			case "time":
				if r[ic] == nil {
					continue
				}
				switch x := r[ic].(type) {
				case string:
					t, err := parseTime(x)
					if err != nil {
						t = time.Now()
					}
					ff = append(ff.([]time.Time), t)
				case float64:
					sec, dec := math.Modf(x / 1000)
					ff = append(ff.([]time.Time), time.Unix(int64(sec), int64(dec*(1e9))))
				case int64:
					ff = append(ff.([]time.Time), time.Unix(x/1000, 0))
				case int:
					ff = append(ff.([]time.Time), time.Unix(int64(x)/1000, 0))
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

func longToLog(longFrame *data.Frame, settings map[string]any) (*data.Frame, error) {
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

// Parses timestamps of format ISO 8601 with and without timezone offset
func parseTime(timeStr string) (time.Time, error) {
	t, err := time.Parse("2006-01-02T15:04:05.000Z", timeStr)
	if err == nil {
		return t, nil
	}
	return time.Parse("2006-01-02T15:04:05.000-07:00", timeStr)
}
