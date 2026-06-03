package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/go-redis/redis/v8"
)

type RateLimiter struct {
	redis         *redis.Client
	normalLimit   int
	burstPerGoal  int
	limitWindow   time.Duration
}

func NewRateLimiter(rdb *redis.Client, normalLimit, burstPerGoal, limitWindowSec int) *RateLimiter {
	return &RateLimiter{
		redis:        rdb,
		normalLimit:  normalLimit,
		burstPerGoal: burstPerGoal,
		limitWindow:  time.Duration(limitWindowSec) * time.Second,
	}
}

func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getClientIP(r)
		goalID := r.Header.Get("X-Agent-Goal-ID")
		taskID := r.Header.Get("X-Agent-Task-ID")

		var allowed bool
		var limit, remaining int
		var err error

		if goalID != "" && taskID != "" {
			allowed, remaining, err = rl.checkGoalLimit(goalID)
			limit = rl.burstPerGoal
		} else {
			allowed, remaining, err = rl.checkIPLimit(ip)
			limit = rl.normalLimit
		}

		if err != nil {
			http.Error(w, "Internal rate limit error", http.StatusInternalServerError)
			return
		}

		if !allowed {
			w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", limit))
			w.Header().Set("X-RateLimit-Remaining", "0")
			w.Header().Set("Retry-After", fmt.Sprintf("%d", int(rl.limitWindow.Seconds())))
			http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", limit))
		w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
		next.ServeHTTP(w, r)
	})
}

func (rl *RateLimiter) checkGoalLimit(goalID string) (bool, int, error) {
	ctx := rl.redis.Context()
	key := fmt.Sprintf("rl:goal:%s", goalID)

	pipe := rl.redis.TxPipeline()
	incr := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, rl.limitWindow)
	_, err := pipe.Exec(ctx)
	if err != nil {
		return false, 0, err
	}

	count := int(incr.Val())
	remaining := rl.burstPerGoal - count
	if remaining < 0 {
		remaining = 0
	}
	return count <= rl.burstPerGoal, remaining, nil
}

func (rl *RateLimiter) checkIPLimit(ip string) (bool, int, error) {
	ctx := rl.redis.Context()
	key := fmt.Sprintf("rl:ip:%s", ip)

	pipe := rl.redis.TxPipeline()
	incr := pipe.Incr(ctx, key)
	pipe.Expire(ctx, key, rl.limitWindow)
	_, err := pipe.Exec(ctx)
	if err != nil {
		return false, 0, err
	}

	count := int(incr.Val())
	remaining := rl.normalLimit - count
	if remaining < 0 {
		remaining = 0
	}
	return count <= rl.normalLimit, remaining, nil
}

func getClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return xff
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}
	return r.RemoteAddr
}
