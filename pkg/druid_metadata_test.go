package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"

	druidquery "github.com/grafadruid/go-druid/builder/query"
)

func TestRetryPolicyNoClientErrors(t *testing.T) {
	ctx := context.Background()

	t.Run("does not retry 4xx client errors, and reports why", func(t *testing.T) {
		for _, code := range []int{http.StatusBadRequest, http.StatusUnauthorized, http.StatusForbidden, http.StatusNotFound} {
			resp := &http.Response{StatusCode: code, Body: io.NopCloser(strings.NewReader(`{"errorMessage":"nope"}`))}
			retry, err := retryPolicyNoClientErrors(ctx, resp, nil)
			if retry {
				t.Errorf("status %d: expected no retry", code)
			}
			// The error carries Druid's reason so it is not swallowed on the way out.
			if err == nil || !strings.Contains(err.Error(), "nope") {
				t.Errorf("status %d: expected the Druid message, got %v", code, err)
			}
		}
	})

	t.Run("retries 429 Too Many Requests", func(t *testing.T) {
		retry, _ := retryPolicyNoClientErrors(ctx, &http.Response{StatusCode: http.StatusTooManyRequests}, nil)
		if !retry {
			t.Error("expected retry on 429")
		}
	})

	t.Run("retries 5xx server errors", func(t *testing.T) {
		for _, code := range []int{http.StatusInternalServerError, http.StatusBadGateway, http.StatusServiceUnavailable} {
			retry, _ := retryPolicyNoClientErrors(ctx, &http.Response{StatusCode: code}, nil)
			if !retry {
				t.Errorf("status %d: expected retry", code)
			}
		}
	})

	t.Run("does not retry a successful response", func(t *testing.T) {
		retry, _ := retryPolicyNoClientErrors(ctx, &http.Response{StatusCode: http.StatusOK}, nil)
		if retry {
			t.Error("expected no retry on 200")
		}
	})
}

func TestMapTableRows(t *testing.T) {
	t.Run("happy path", func(t *testing.T) {
		rows := []map[string]any{
			{"TABLE_SCHEMA": "druid", "TABLE_NAME": "wikipedia"},
			{"TABLE_SCHEMA": "sys", "TABLE_NAME": "segments"},
		}
		got := mapTableRows(rows)
		if len(got) != 2 {
			t.Fatalf("expected 2 tables, got %d", len(got))
		}
		if got[0].Schema != "druid" || got[0].Name != "wikipedia" {
			t.Errorf("unexpected first table: %+v", got[0])
		}
		if got[1].Schema != "sys" || got[1].Name != "segments" {
			t.Errorf("unexpected second table: %+v", got[1])
		}
	})

	t.Run("missing name is skipped", func(t *testing.T) {
		rows := []map[string]any{
			{"TABLE_SCHEMA": "druid"},
			{"TABLE_SCHEMA": "druid", "TABLE_NAME": "ok"},
		}
		got := mapTableRows(rows)
		if len(got) != 1 || got[0].Name != "ok" {
			t.Errorf("expected only the named row, got %+v", got)
		}
	})

	t.Run("non-string values are ignored gracefully", func(t *testing.T) {
		rows := []map[string]any{
			{"TABLE_SCHEMA": 123, "TABLE_NAME": "keep"},
			{"TABLE_SCHEMA": "druid", "TABLE_NAME": 456},
		}
		got := mapTableRows(rows)
		if len(got) != 1 {
			t.Fatalf("expected 1 table, got %d (%+v)", len(got), got)
		}
		if got[0].Name != "keep" || got[0].Schema != "" {
			t.Errorf("unexpected mapping: %+v", got[0])
		}
	})

	t.Run("empty input yields empty non-nil slice", func(t *testing.T) {
		got := mapTableRows(nil)
		if got == nil {
			t.Fatal("expected non-nil slice")
		}
		if len(got) != 0 {
			t.Errorf("expected empty slice, got %+v", got)
		}
	})
}

func TestMapColumnRows(t *testing.T) {
	t.Run("happy path", func(t *testing.T) {
		rows := []map[string]any{
			{"COLUMN_NAME": "__time", "DATA_TYPE": "TIMESTAMP"},
			{"COLUMN_NAME": "channel", "DATA_TYPE": "VARCHAR"},
			{"COLUMN_NAME": "added", "DATA_TYPE": "BIGINT"},
		}
		got := mapColumnRows(rows)
		if len(got) != 3 {
			t.Fatalf("expected 3 columns, got %d", len(got))
		}
		if got[0].Name != "__time" || got[0].Type != "TIMESTAMP" {
			t.Errorf("unexpected first column: %+v", got[0])
		}
	})

	t.Run("missing name is skipped, missing type is empty", func(t *testing.T) {
		rows := []map[string]any{
			{"DATA_TYPE": "VARCHAR"},
			{"COLUMN_NAME": "col"},
		}
		got := mapColumnRows(rows)
		if len(got) != 1 {
			t.Fatalf("expected 1 column, got %d (%+v)", len(got), got)
		}
		if got[0].Name != "col" || got[0].Type != "" {
			t.Errorf("unexpected mapping: %+v", got[0])
		}
	})

	t.Run("empty input yields empty non-nil slice", func(t *testing.T) {
		got := mapColumnRows([]map[string]any{})
		if got == nil {
			t.Fatal("expected non-nil slice")
		}
		if len(got) != 0 {
			t.Errorf("expected empty slice, got %+v", got)
		}
	})
}

func TestParseColumnsRequest(t *testing.T) {
	t.Run("missing table errors", func(t *testing.T) {
		if _, _, err := parseColumnsRequest([]byte(`{"schema":"druid"}`)); err == nil {
			t.Error("expected error for missing table")
		}
	})

	t.Run("default schema applied", func(t *testing.T) {
		schema, table, err := parseColumnsRequest([]byte(`{"table":"wikipedia"}`))
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if schema != "druid" {
			t.Errorf("expected default schema druid, got %q", schema)
		}
		if table != "wikipedia" {
			t.Errorf("expected table wikipedia, got %q", table)
		}
	})

	t.Run("explicit schema preserved", func(t *testing.T) {
		schema, table, err := parseColumnsRequest([]byte(`{"schema":"sys","table":"segments"}`))
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if schema != "sys" || table != "segments" {
			t.Errorf("unexpected parse: schema=%q table=%q", schema, table)
		}
	})

	t.Run("invalid json errors", func(t *testing.T) {
		if _, _, err := parseColumnsRequest([]byte(`not json`)); err == nil {
			t.Error("expected error for invalid json")
		}
	})
}

// TestSQLQueryMarshaling guards against go-druid API drift: the parameterized
// columns query must marshal to the expected native Druid SQL JSON.
func TestSQLQueryMarshaling(t *testing.T) {
	q := druidquery.NewSQL().
		SetQuery("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?").
		SetResultFormat("object").
		SetParameters([]druidquery.SQLParameter{
			{Type: "VARCHAR", Value: "druid"},
			{Type: "VARCHAR", Value: "wikipedia"},
		})
	b, err := json.Marshal(q)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}
	var out map[string]any
	if err := json.Unmarshal(b, &out); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}
	if out["queryType"] != "sql" {
		t.Errorf("expected queryType sql, got %v", out["queryType"])
	}
	if out["resultFormat"] != "object" {
		t.Errorf("expected resultFormat object, got %v", out["resultFormat"])
	}
	params, ok := out["parameters"].([]any)
	if !ok || len(params) != 2 {
		t.Fatalf("expected 2 parameters, got %v", out["parameters"])
	}
	first, _ := params[0].(map[string]any)
	if first["type"] != "VARCHAR" || first["value"] != "druid" {
		t.Errorf("unexpected first parameter: %v", first)
	}
}

func TestDruidClientError(t *testing.T) {
	newResp := func(code int, body string) *http.Response {
		return &http.Response{StatusCode: code, Body: io.NopCloser(strings.NewReader(body))}
	}

	t.Run("surfaces errorMessage rather than the generic error code", func(t *testing.T) {
		// Druid 37 reports a SQL syntax error like this; go-druid alone would only say "druidException".
		body := `{"error":"druidException","errorCode":"invalidInput","errorMessage":"Incorrect syntax near the keyword 'FROM' at line 1, column 9"}`
		err := druidClientError(newResp(400, body))
		if err == nil {
			t.Fatal("expected an error")
		}
		if !strings.Contains(err.Error(), "Incorrect syntax near the keyword 'FROM'") {
			t.Errorf("errorMessage not surfaced: %v", err)
		}
		if !strings.Contains(err.Error(), "400") {
			t.Errorf("status code missing: %v", err)
		}
	})

	t.Run("falls back to the error code when there is no message", func(t *testing.T) {
		err := druidClientError(newResp(400, `{"error":"druidException"}`))
		if !strings.Contains(err.Error(), "druidException") {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("falls back to the raw body when it is not Druid JSON", func(t *testing.T) {
		err := druidClientError(newResp(404, "no such endpoint"))
		if !strings.Contains(err.Error(), "no such endpoint") {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("still reports the status for an empty body", func(t *testing.T) {
		err := druidClientError(newResp(403, ""))
		if !strings.Contains(err.Error(), "403") {
			t.Errorf("unexpected error: %v", err)
		}
	})
}

func TestUnwrapDruidError(t *testing.T) {
	t.Run("strips go-retryablehttp's wrapping from a Druid error", func(t *testing.T) {
		inner := &druidError{status: 400, detail: "Incorrect syntax near the keyword 'FROM'"}
		wrapped := fmt.Errorf("POST http://router:8888/druid/v2/sql giving up after 1 attempt(s): %w", inner)
		got := unwrapDruidError(wrapped)
		if got.Error() != inner.Error() {
			t.Errorf("expected just the Druid error, got %q", got.Error())
		}
		if strings.Contains(got.Error(), "giving up") {
			t.Errorf("wrapper not stripped: %q", got.Error())
		}
	})

	t.Run("leaves unrelated errors untouched", func(t *testing.T) {
		other := errors.New("connection refused")
		if unwrapDruidError(other) != other {
			t.Error("expected the same error instance")
		}
	})

	t.Run("formats a detail-less error with just the status", func(t *testing.T) {
		e := &druidError{status: 403}
		if e.Error() != "druid returned HTTP 403" {
			t.Errorf("unexpected message: %q", e.Error())
		}
	})
}
