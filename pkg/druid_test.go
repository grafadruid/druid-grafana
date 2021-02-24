package main

import (
	"testing"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/stretchr/testify/assert"
)

func TestNewDataSourceInstance(t *testing.T) {
	dsSettings := backend.DataSourceInstanceSettings{
		ID:               0,
		Name:             "",
		URL:              "localhost:8082",
		User:             "",
		Database:         "",
		BasicAuthEnabled: false,
		BasicAuthUser:    "",
		JSONData: []byte(`{
				"connection.skipTls": true
			}`),
	}
	inst, err := newDataSourceInstance(dsSettings)
	// var a druidInstanceSettings = *inst
	assert.Nil(t, err, "error should be nil")
	assert.NotNil(t, inst, "error should not be nil")
	// TODO: how to check (*inst.client).skipTLSVerify here?
	// assert.True(t, (*inst.client).skipTLSVerify, "")
}
