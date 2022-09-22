//go:build mage
// +build mage

package main

import (
	"fmt"
	"os"
	"path/filepath"

	//mage:import sdk
	_ "github.com/grafana/grafana-plugin-sdk-go/build"

	"github.com/magefile/mage/mg"
	"github.com/magefile/mage/sh"
)

const (
	defaultIngestScript   string = "docker/provisioning/post-index-task"
	defaultIngestSpecFile string = "docker/provisioning/ingest-spec.json"
	defaultCoordinatorURL string = "http://coordinator:8081"
	defaultBrokerURL      string = "http://broker:8082"
	taskEndpoint          string = "/druid/indexer/v1/task"
	grafanaVersion        string = "8.4.3"
)

var (
	useDocker          bool = os.Getenv("GRAFADRUID_USE_DOCKER") != "0"
	useDockerComposeV2 bool = os.Getenv("GRAFADRUID_USE_DOCKER_COMPOSE_V2") != "0"
)

func getDockerComposeCmdPrefix() []string {
	if useDockerComposeV2 {
		return []string{"docker", "compose"}
	}
	return []string{"docker-compose"}
}

func runDockerComposeCmd(cmd ...string) error {
	finalCmd := append(getDockerComposeCmdPrefix(), cmd...)
	return sh.RunV(finalCmd[0], finalCmd[1:]...)
}

func runToolboxCmd(cmd ...string) error {
	if useDocker {
		cmd = append(append(getDockerComposeCmdPrefix(), "exec", "toolbox"), cmd...)
	}

	return sh.RunV(cmd[0], cmd[1:]...)
}

type Env mg.Namespace

// UpdateMage mage compiles mage in order to avoid Mage dependency on the host
func (e Env) UpdateMage() error { return sh.Run("mage", "-compile", "./mage") }

// Fmt formats the backend code (gofumpt)
func (e Env) Fmt() error {
	goFiles, err := filepath.Glob("**/*.go")
	if err != nil {
		return err
	}

	if err := sh.RunV(
		"gofumpt", append([]string{"-w", "Magefile.go"}, goFiles...)...,
	); err != nil {
		return err
	}
	return sh.RunV("yarn", "fmt")
}

// Start starts the development environment
func (e Env) Start() error {
	if err := runDockerComposeCmd("up", "-d"); err != nil {
		return err
	}

	if err := e.Provision(); err != nil {
		return err
	}

	fmt.Printf("\nDruid: http://localhost:8888")
	fmt.Println("\nGrafana: http://localhost:3000 (use druid/druid to login)")

	return nil
}

// Stop stops the development environment
func (e Env) Stop(removeVolumes bool) error {
	cmd := []string{"down"}

	if removeVolumes {
		cmd = append(cmd, "-v")
	}

	return runDockerComposeCmd(cmd...)
}

// Rebuild rebuilds container images from Dockerfiles
func (e Env) Rebuild() error { return runDockerComposeCmd("build") }

// Provision provisions example data in Druid
func (e Env) Provision() error {
	fmt.Println("\nIngesting example data into Druid")

	return runToolboxCmd(
		defaultIngestScript,
		"--file",
		defaultIngestSpecFile,
		"--url",
		defaultCoordinatorURL,
		"--complete-timeout",
		"1200",
		"--coordinator-url",
		defaultCoordinatorURL,
		"--broker-url",
		defaultBrokerURL,
	)
}

// Restart stops and start the development environment
func (e Env) Restart() error {
	if err := e.Stop(false); err != nil {
		return err
	}

	return e.Start()
}

type Frontend mg.Namespace

// Build builds the frontend plugin
func (Frontend) Build() error {
	err := runToolboxCmd("yarn", "install")
	if err != nil {
		return err
	}
	return runToolboxCmd("npx", "@grafana/toolkit@"+grafanaVersion, "plugin:build")
	// return runToolboxCmd("npx", "@grafana/toolkit", "plugin:build", "--preserveConsole")
}

// Test runs frontend tests
func (Frontend) Test() error {
	return runToolboxCmd("npx", "@grafana/toolkit@"+grafanaVersion, "plugin:test")
}

// Dev runs frontend in development mode
func (Frontend) Dev() error {
	return runToolboxCmd("npx", "@grafana/toolkit@"+grafanaVersion, "plugin:dev")
}

// Watch runs frontend in development mode + autoreload on changes
func (Frontend) Watch() error {
	return runToolboxCmd("npx", "@grafana/toolkit@"+grafanaVersion, "plugin:dev", "--watch")
}

type Backend mg.Namespace

// Build creates a release build of the backend plugin for all platforms
func (Backend) Build() error { return runToolboxCmd("./mage", "sdk:build:backend") }

// Linux creates a release build of the backend plugin for Linux
func (Backend) Linux() error { return runToolboxCmd("./mage", "sdk:build:linux") }

// Darwin creates a release build of the backend plugin for macOS
func (Backend) Darwin() error { return runToolboxCmd("./mage", "sdk:build:darwin") }

// Windows creates a relese build of the backend plugin for Windows
func (Backend) Windows() error { return runToolboxCmd("./mage", "sdk:build:windows") }

// Debug creates a debug build of the backend plugin for the current platform
func (Backend) Debug() error { return runToolboxCmd("./mage", "sdk:build:debug") }

// BuildAll creates release build of all plugin components
func (Backend) BuildAll() error { return runToolboxCmd("./mage", "sdk:buildAll") }

// Clean cleans build artifacts (by deleting the dist directory)
func (Backend) Clean() error { return runToolboxCmd("./mage", "sdk:clean") }

// Coverage rune backend tests and make a coverage report
func (Backend) Coverage() error { return runToolboxCmd("./mage", "sdk:coverage") }

// Format formats the sources
func (Backend) Format() error { return runToolboxCmd("./mage", "sdk:format") }

// Lint audits the source style
func (Backend) Lint() error { return runToolboxCmd("./mage", "sdk:lint") }

// ReloadPlugin kills any running instances and wait for Grafana to reload the plugin
func (Backend) ReloadPlugin() error {
	return runDockerComposeCmd("restart", "grafana")
}

// Test runs backend tests
func (Backend) Test() error { return runToolboxCmd("./mage", "sdk:test") }

// BuildAll builds the plugin (both frontend and backend)
func BuildAll() { mg.Deps(Backend{}.BuildAll, Frontend{}.Build) }

// Default configures the default target (build all plugin components)
var Default = BuildAll
