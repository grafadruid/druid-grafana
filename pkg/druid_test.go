package main

import (
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// Grafana can send a query model before the user has entered a query, in which
// case builder/settings are missing. Such queries must be skipped instead of
// panicking with a nil pointer dereference in executeQuery.
func TestQueryWithoutBuilderOrSettingsIsSkipped(t *testing.T) {
	for name, raw := range map[string]string{
		"no builder, no settings": `{"queryText":"SELECT 1 AS x"}`,
		"builder only":            `{"builder":{"queryType":"sql"}}`,
		"settings only":           `{"settings":{}}`,
		"empty query object":      `{}`,
	} {
		t.Run(name, func(t *testing.T) {
			ds := &druidDatasource{settings: &druidInstanceSettings{}}
			response := ds.query(backend.DataQuery{RefID: "A", JSON: []byte(raw)}, ds.settings)
			if response.Error != nil {
				t.Fatalf("unexpected error: %v", response.Error)
			}
			if len(response.Frames) != 0 {
				t.Fatalf("expected no frames, got %d", len(response.Frames))
			}
		})
	}
}

func TestQueryVariableWithoutBuilderOrSettingsIsSkipped(t *testing.T) {
	ds := &druidDatasource{settings: &druidInstanceSettings{}}
	values, err := ds.queryVariable([]byte(`{"queryText":"SELECT 1 AS x"}`), ds.settings)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(values) != 0 {
		t.Fatalf("expected no values, got %d", len(values))
	}
}
