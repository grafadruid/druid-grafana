#!/bin/bash
set -eo pipefail

declare -r WORKSPACE="/workspace"
declare -r TOOL_VERSIONS=".tool-versions"
declare PLUGINS; PLUGINS="$(awk '{print $1}' "${WORKSPACE}/${TOOL_VERSIONS}")"

plugin_installed() {
  local plugin="${1}"

  if asdf plugin list | grep -q "${plugin}"; then
    return 0
  fi

  return 1
}

get_version() {
  local tool="${1}"
  local version
  version="$(awk "/^${tool}/ {print \$2}" "${WORKSPACE}/${TOOL_VERSIONS}")"

  printf "%s" "${version}"
}

version_installed() {
  local tool="${1}"
  local version
  version="$(get_version "${tool}")"

  if asdf list "${tool}" | grep -q "${version}"; then
    return 0
  fi

  return 1
}

install() {
  for plugin in ${PLUGINS}; do
    if ! plugin_installed "${plugin}"; then
      printf "Plugin %s not installed - installing\n" "${plugin}"
      asdf plugin add "${plugin}"
    fi

    if ! version_installed "${plugin}"; then
      local version; version="$(get_version "${plugin}")"
      printf "%s version %s not installed - installing\n" "${plugin}" "${version}"
      asdf install "${plugin}" "${version}"
    fi
  done

  while read -r item; do
    local plugin; plugin="$(printf "%s" "${item}" | awk '{print $1}')"
    local version; version="$(printf "%s" "${item}" | awk '{print $2}')"
    asdf global "${plugin}" "${version}"
  done < "${WORKSPACE}/${TOOL_VERSIONS}"

  asdf reshim

  printf "All plugins installed\n"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then install; fi
