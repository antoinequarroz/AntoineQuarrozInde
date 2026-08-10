#!/usr/bin/env bash
set -euo pipefail

# Install this script outside the Git checkout and use it as an authorized_keys
# forced command. It accepts only the one non-interactive deployment command
# emitted by the GitHub workflow; arbitrary shells, scripts and forwarding stay blocked.
readonly allowed_project_dir="${AQ_CI_PROJECT_DIR:-/home/ubuntu/antoinequarroz-vitrine}"
readonly deploy_command="${AQ_CI_DEPLOY_COMMAND:-/home/ubuntu/.local/bin/antoinequarroz-ci-deploy}"
readonly original_command="${SSH_ORIGINAL_COMMAND:-}"
readonly command_pattern="^bash -s -- '([0-9a-f]{40})' '([^']+)'$"

if [[ ! "$original_command" =~ $command_pattern ]] || [[ "${BASH_REMATCH[2]:-}" != "$allowed_project_dir" ]]; then
  echo "This SSH key is restricted to verified production deployments." >&2
  exit 64
fi

if [[ ! -x "$deploy_command" ]]; then
  echo "The verified production deployment command is unavailable." >&2
  exit 69
fi

exec "$deploy_command" "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
