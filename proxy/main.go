package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"github.com/go-redis/redis/v8"

	"github.com/agentshield/proxy/config"
	"github.com/agentshield/proxy/middleware"
)

func main() {
	cfg := config.Load()

	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
	})

	_, err := rdb.Ping(rdb.Context()).Result()
	if err != nil {
		log.Fatalf("Failed to connect to Redis at %s: %v", cfg.RedisAddr, err)
	}
	log.Printf("Connected to Redis at %s", cfg.RedisAddr)

	backendURL, err := url.Parse(cfg.BackendURL)
	if err != nil {
		log.Fatalf("Invalid backend URL %s: %v", cfg.BackendURL, err)
	}

	reverseProxy := httputil.NewSingleHostReverseProxy(backendURL)

	rateLimiter := middleware.NewRateLimiter(
		rdb,
		cfg.NormalLimit,
		cfg.BurstPerGoal,
		cfg.LimitWindowSec,
	)

	coalescer := middleware.NewRequestCoalescer(cfg.CoalesceWindowMs)
	coalescer.Cleanup(5 * time.Second)

	loopDetector := middleware.NewLoopDetector(
		rdb,
		cfg.LoopThreshold,
		cfg.LoopWindowSec,
	)

	// Middleware chain: RateLimiter -> LoopDetector -> Coalescer -> Proxy
	var handler http.Handler = reverseProxy
	handler = coalescer.Middleware(handler)
	handler = loopDetector.Middleware(handler)
	handler = rateLimiter.Middleware(handler)

	// Health check and metrics endpoints
	mux := http.NewServeMux()
	mux.Handle("/health", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}))
	mux.Handle("/", handler)

	srv := &http.Server{
		Addr:         cfg.ListenAddr,
		Handler:      mux,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	log.Printf("AgentShield proxy listening on %s, forwarding to %s", cfg.ListenAddr, cfg.BackendURL)
	log.Printf("Rate limits: %d req/%ds (IP), %d req/%ds (Goal burst)", cfg.NormalLimit, cfg.LimitWindowSec, cfg.BurstPerGoal, cfg.LimitWindowSec)
	log.Fatal(srv.ListenAndServe())
}
