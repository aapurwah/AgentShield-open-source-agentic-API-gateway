#!/usr/bin/env bash
set -euo pipefail

# Simple script to build, push images to GHCR and deploy via Helm.
# Usage:
#   GHCR_OWNER=myuser IMAGE_TAG=latest ./scripts/push-and-deploy.sh

REGISTRY_OWNER=${GHCR_OWNER:-"<your-username>"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
HELM_RELEASE=${HELM_RELEASE:-"agentshield"}
NAMESPACE=${NAMESPACE:-"agentshield"}

echo "Building images for ${REGISTRY_OWNER} with tag ${IMAGE_TAG}"

docker build -t ghcr.io/${REGISTRY_OWNER}/agentshield-proxy:${IMAGE_TAG} -f proxy/Dockerfile ./proxy
docker build -t ghcr.io/${REGISTRY_OWNER}/agentshield-dashboard:${IMAGE_TAG} -f dashboard/Dockerfile ./dashboard
docker build -t ghcr.io/${REGISTRY_OWNER}/agentshield-mock-backend:${IMAGE_TAG} -f mock-backend/Dockerfile ./mock-backend

echo "Logging in to ghcr.io (use a PAT or GITHUB_TOKEN via docker login)"
read -p "GHCR username: " USERNAME
read -s -p "GHCR token (password): " TOKEN
echo
echo "$TOKEN" | docker login ghcr.io -u "$USERNAME" --password-stdin

echo "Pushing images"
docker push ghcr.io/${REGISTRY_OWNER}/agentshield-proxy:${IMAGE_TAG}
docker push ghcr.io/${REGISTRY_OWNER}/agentshield-dashboard:${IMAGE_TAG}
docker push ghcr.io/${REGISTRY_OWNER}/agentshield-mock-backend:${IMAGE_TAG}

echo "Deploying Helm chart to namespace ${NAMESPACE}"
kubectl create ns ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f - || true
helm upgrade --install ${HELM_RELEASE} helm/agentshield \
  --namespace ${NAMESPACE} \
  --set proxy.image.repository=ghcr.io/${REGISTRY_OWNER}/agentshield-proxy \
  --set proxy.image.tag=${IMAGE_TAG} \
  --set dashboard.image.repository=ghcr.io/${REGISTRY_OWNER}/agentshield-dashboard \
  --set dashboard.image.tag=${IMAGE_TAG} \
  --set mockBackend.enabled=true \
  --set mockBackend.image.repository=ghcr.io/${REGISTRY_OWNER}/agentshield-mock-backend \
  --set mockBackend.image.tag=${IMAGE_TAG}

echo "Done."
