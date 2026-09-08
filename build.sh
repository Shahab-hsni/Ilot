#!/bin/sh
# Intentional no-op.
#
# This repo deploys via the Dockerfile build pack, but Coolify's Nixpacks
# bridge still probes for /artifacts/build.sh and fails the deployment if it
# is missing. Exiting 0 satisfies that check and lets the Docker build proceed.
#
# Nothing is built here. The real build is `next build` inside the Dockerfile.
exit 0
