#!/bin/sh
# No-op build script — Coolify Nixpacks bridge expects /artifacts/build.sh even
# when using the Dockerfile build pack. This exits cleanly so the deployment
# proceeds past the spurious build.sh check. kos shere  nist ?
exit 0
