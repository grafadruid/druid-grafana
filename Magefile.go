//+build mage

package main

import (
	"fmt"
	"os"

	//mage:import sdk
	_ "github.com/grafana/grafana-plugin-sdk-go/build"

	"github.com/magefile/mage/mg"
	"github.com/magefile/mage/sh"
)

const (
	defaultDownloadDir    string = "/tmp/"
	defaultIngestSpecFile string = "docker/provisioning/ingest-spec.json"
	defaultCoordinatorURL string = "http://coordinator:8081"
	taskEndpoint          string = "/druid/indexer/v1/task"
)

var (
	useDocker bool     = os.Getenv("DOCKER") != "0"
	docker    []string = []string{"docker-compose", "-f", "docker/docker-compose.yml", "exec", "toolbox"}
)

func run(cmd ...string) error {
	if useDocker {
		cmd = append(docker, cmd...)
	}
	if err := sh.RunV(cmd[0], cmd[1:]...); err != nil {
		return err
	}
	return nil
}

type Env mg.Namespace

// Mage Compiles mage in order to avoid Mage dependency on the host.
func (Env) UpdateMage() error {
	if err := sh.Run("mage", "-compile", "./mage"); err != nil {
		return err
	}
	return nil
}

// Start starts the development environment
func (Env) Start() error {
	if err := sh.RunV("docker-compose", "-f", "docker/docker-compose.yml", "up", "-d"); err != nil {
		return err
	}
	e := Env{}
	if err := e.Provision(); err != nil {
		return err
	}
	fmt.Printf("\nGrafana: http://localhost:3000\nDruid: http://localhost:8888\n")
	return nil
}

// Stop stop the development environment
func (Env) Stop() error {
	if err := sh.RunV("docker-compose", "-f", "docker/docker-compose.yml", "down", "-v"); err != nil {
		return err
	}
	return nil
}

// Rebuild rebuilds images from Dockerfile
func (Env) Rebuild() error {
	if err := sh.RunV("docker-compose", "-f", "docker/docker-compose.yml", "build"); err != nil {
		return err
	}
	return nil
}

// Provision provisions druid example data in druid
func (Env) Provision() error {
	fileList := []string{"post-index-task", "post-index-task-main"}
	if err := downloadDruidScripts(defaultDownloadDir, fileList); err != nil {
		return err
	}
	fmt.Printf("\nIngesting example data in druid\n")
	ingestScript := defaultDownloadDir + "post-index-task"
	if err := run(ingestScript, "--file", defaultIngestSpecFile, "--url", defaultCoordinatorURL, "--complete-timeout", "1200", "--coordinator-url", defaultCoordinatorURL); err != nil {
		return err
	}
	return nil
}

func downloadDruidScripts(defaultDownloadDir string, fileList []string) error {
	fmt.Printf("\nDownloading required scripts\n")
	for _, file := range fileList {
		fp := defaultDownloadDir + file
		if err := run("wget", "-q", "-O", fp, "https://raw.githubusercontent.com/apache/druid/master/examples/bin/"+file); err != nil {
			return err
		}
		if err := run("chmod", "+x", fp); err != nil {
			return err
		}
	}
	return nil
}

// Restart stop & start the development environment
func (Env) Restart() {
	e := Env{}
	e.Stop()
	e.Start()
}

type Frontend mg.Namespace

// Build builds the frontend plugin
func (Frontend) Build() error {
	err := run("yarn", "install")
	if err == nil {
		err = run("npx", "@grafana/toolkit", "plugin:build")
	}
	return err
}

// Test runs frontend tests
func (Frontend) Test() error {
	return run("npx", "@grafana/toolkit", "plugin:test")
}

// Dev frontend dev
func (Frontend) Dev() error {
	return run("npx", "@grafana/toolkit", "plugin:dev")
}

// Watch frontend dev watch
func (Frontend) Watch() error {
	return run("npx", "@grafana/toolkit", "plugin:dev", "--watch")
}

type Backend mg.Namespace

// Build build a production build for all platforms.
func (Backend) Build() {
	run("mage", "sdk:build:backend")
}

// Linux builds the back-end plugin for Linux.
func (Backend) Linux() {
	run("mage", "sdk:build:linux")
}

// Darwin builds the back-end plugin for OSX.
func (Backend) Darwin() {
	run("mage", "sdk:build:darwin")
}

// Windows builds the back-end plugin for Windows.
func (Backend) Windows() {
	run("mage", "sdk:build:windows")
}

// Debug builds the debug version for the current platform.
func (Backend) Debug() {
	run("mage", "sdk:build:debug")
}

// BuildAll builds production back-end components.
func (Backend) BuildAll() {
	run("mage", "sdk:buildAll")
}

// Clean cleans build artifacts, by deleting the dist directory.
func (Backend) Clean() {
	run("mage", "sdk:clean")
}

//Coverage runs backend tests and makes a coverage report.
func (Backend) Coverage() {
	run("mage", "sdk:coverage")
}

// Format formats the sources.
func (Backend) Format() {
	run("mage", "sdk:format")
}

// Lint audits the source style.
func (Backend) Lint() {
	run("mage", "sdk:lint")
}

// ReloadPlugin kills any running instances and waits for grafana to reload the plugin.
func (Backend) ReloadPlugin() error {
	if err := sh.RunV("docker-compose", "-f", "docker/docker-compose.yml", "restart", "grafana"); err != nil {
		return err
	}
	return nil
}

//Test runs backend tests.
func (Backend) Test() {
	run("mage", "sdk:test")
}

//BuildAll builds the plugin, frontend and backend.
func BuildAll() {
	b := Backend{}
	f := Frontend{}
	mg.Deps(b.BuildAll, f.Build)
}

// Default configures the default target.
var Default = BuildAll
