package main

import (
	"os"

	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
)

func main() {
	// Start listening to requests sent from Grafana. This call is blocking so
	// it won't finish until Grafana shuts down the process. or the plugin chooses
	// to exit and close down by itself.
	// Log any error if we could not start the plugin.
	if err := datasource.Serve(newDatasource()); err != nil {
		log.DefaultLogger.Error(err.Error())
		os.Exit(1)
	}
}
