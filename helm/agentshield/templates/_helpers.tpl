{{/*
Expand the name of the chart.
*/}}
{{- define "agentshield.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "agentshield.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "agentshield.labels" -}}
helm.sh/chart: {{ include "agentshield.name" . }}-{{ .Chart.Version | replace "+" "_" }}
{{ include "agentshield.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "agentshield.selectorLabels" -}}
app.kubernetes.io/name: {{ include "agentshield.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Redis password - stable across upgrades for embedded Redis
*/}}
{{- define "agentshield.redisPassword" -}}
{{- if .Values.redis.enabled }}
{{- $secret := lookup "v1" "Secret" .Release.Namespace (printf "%s-redis-password" (include "agentshield.fullname" .)) }}
{{- if $secret }}
{{- index $secret.data "REDIS_PASSWORD" | b64dec }}
{{- else }}
{{- randAlphaNum 32 }}
{{- end }}
{{- else }}
{{- .Values.redis.externalPassword }}
{{- end }}
{{- end }}
