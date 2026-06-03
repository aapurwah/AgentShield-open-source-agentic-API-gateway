package config

import "os"

type Config struct {
	ListenAddr    string
	BackendURL    string
	RedisAddr     string
	RedisPassword string
	CoalesceWindowMs int
	LoopThreshold    int
	LoopWindowSec    int
	BurstPerGoal     int
	NormalLimit      int
	LimitWindowSec   int
}

func Load() *Config {
	return &Config{
		ListenAddr:       envOrDefault("LISTEN_ADDR", ":8080"),
		BackendURL:       envOrDefault("BACKEND_URL", "http://mock-backend:3001"),
		RedisAddr:        envOrDefault("REDIS_ADDR", "redis:6379"),
		RedisPassword:    os.Getenv("REDIS_PASSWORD"),
		CoalesceWindowMs: 100,
		LoopThreshold:    20,
		LoopWindowSec:    5,
		BurstPerGoal:     1000,
		NormalLimit:      100,
		LimitWindowSec:   60,
	}
}

func envOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
