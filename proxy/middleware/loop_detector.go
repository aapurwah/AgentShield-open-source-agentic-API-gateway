package middleware

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-redis/redis/v8"
)

type LoopDetector struct {
	redis       *redis.Client
	threshold   int
	window      time.Duration
}

func NewLoopDetector(rdb *redis.Client, threshold, windowSec int) *LoopDetector {
	return &LoopDetector{
		redis:     rdb,
		threshold: threshold,
		window:    time.Duration(windowSec) * time.Second,
	}
}

func (ld *LoopDetector) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		taskID := r.Header.Get("X-Agent-Task-ID")
		if taskID == "" {
			next.ServeHTTP(w, r)
			return
		}

		endpointKey := fmt.Sprintf("%s %s", r.Method, r.URL.Path)
		redisKey := fmt.Sprintf("loop:%s:%s", taskID, endpointKey)

		ctx := ld.redis.Context()
		pipe := ld.redis.TxPipeline()
		incr := pipe.Incr(ctx, redisKey)
		pipe.Expire(ctx, redisKey, ld.window)
		_, err := pipe.Exec(ctx)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}

		count := int(incr.Val())

		if count > ld.threshold {
			log.Printf("[WARN] Loop detected: task=%s endpoint=%s count=%d", taskID, endpointKey, count)
			w.Header().Set("X-Loop-Detected", "true")
			w.Header().Set("X-Loop-Count", fmt.Sprintf("%d", count))
			http.Error(w, "Loop detected - task stuck on endpoint", http.StatusTeapot)
			return
		}

		if count >= ld.threshold-5 {
			w.Header().Set("X-Loop-Warning", fmt.Sprintf("%d/%d requests to this endpoint", count, ld.threshold))
		}

		next.ServeHTTP(w, r)
	})
}
