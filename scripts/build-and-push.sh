#!/usr/bin/env bash
# Build + push all Unskinned images. Run from the repo root.
#
#   REGISTRY=registry.example.com TAG=latest ./scripts/build-and-push.sh
#
# REGISTRY must match the image prefix used in infra/k8s/*.yaml (or override there
# with `kustomize edit set image`). Requires: docker logged in to the registry.
set -euo pipefail

REGISTRY="${REGISTRY:-registry.example.com}"
TAG="${TAG:-latest}"

# image-name : dockerfile-path
IMAGES=(
  "auth:services/auth/Dockerfile"
  "catalog:services/catalog/Dockerfile"
  "billing:services/billing/Dockerfile"
  "engagement:services/engagement/Dockerfile"
  "notifications:services/notifications/Dockerfile"
  "web:apps/web/Dockerfile"
  "agent:apps/agent/Dockerfile"
)

cd "$(dirname "$0")/.."

for entry in "${IMAGES[@]}"; do
  name="${entry%%:*}"
  dockerfile="${entry##*:}"
  image="${REGISTRY}/${name}:${TAG}"
  echo "==> building ${image}  (-f ${dockerfile})"
  docker build -f "${dockerfile}" -t "${image}" .
  echo "==> pushing ${image}"
  docker push "${image}"
done

echo "All images built + pushed to ${REGISTRY} (tag ${TAG})."
