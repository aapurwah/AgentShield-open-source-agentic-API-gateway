package middleware

import (
	"bytes"
	"crypto/sha256"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

type cacheEntry struct {
	statusCode int
	header     http.Header
	body       []byte
	expiresAt  time.Time
}

type RequestCoalescer struct {
	mu       sync.RWMutex
	cache    map[string]*cacheEntry
	inflight map[string]*sync.RWMutex
	window   time.Duration
}

func NewRequestCoalescer(windowMs int) *RequestCoalescer {
	return &RequestCoalescer{
		cache:    make(map[string]*cacheEntry),
		inflight: make(map[string]*sync.RWMutex),
		window:   time.Duration(windowMs) * time.Millisecond,
	}
}

func (rc *RequestCoalescer) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		goalID := r.Header.Get("X-Agent-Goal-ID")
		if goalID == "" {
			next.ServeHTTP(w, r)
			return
		}

		key := generateKey(r, goalID)

		rc.mu.RLock()
		entry, exists := rc.cache[key]
		rc.mu.RUnlock()

		if exists && time.Now().Before(entry.expiresAt) {
			for k, vals := range entry.header {
				for _, v := range vals {
					w.Header().Add(k, v)
				}
			}
			w.WriteHeader(entry.statusCode)
			w.Write(entry.body)
			return
		}

		// Check if there's an inflight request
		rc.mu.Lock()
		lock, inflight := rc.inflight[key]
		if inflight {
			rc.mu.Unlock()
			lock.RLock()
			// Re-check cache after inflight completes
			rc.mu.RLock()
			entry2, exists2 := rc.cache[key]
			rc.mu.RUnlock()
			lock.RUnlock()
			if exists2 && time.Now().Before(entry2.expiresAt) {
				for k, vals := range entry2.header {
					for _, v := range vals {
						w.Header().Add(k, v)
					}
				}
				w.WriteHeader(entry2.statusCode)
				w.Write(entry2.body)
				return
			}
			// Fall through to forward
		} else {
			lock = &sync.RWMutex{}
			lock.Lock() // Write lock while we do the backend call
			rc.inflight[key] = lock
			rc.mu.Unlock()

			rw := &responseRecorder{header: make(http.Header)}
			next.ServeHTTP(rw, r)

			entry := &cacheEntry{
				statusCode: rw.statusCode,
				header:     rw.header,
				body:       rw.body,
				expiresAt:  time.Now().Add(rc.window),
			}

			rc.mu.Lock()
			rc.cache[key] = entry
			delete(rc.inflight, key)
			rc.mu.Unlock()
			lock.Unlock()

			for k, vals := range entry.header {
				for _, v := range vals {
					w.Header().Add(k, v)
				}
			}
			w.WriteHeader(entry.statusCode)
			w.Write(entry.body)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (rc *RequestCoalescer) Cleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			rc.mu.Lock()
			now := time.Now()
			for k, v := range rc.cache {
				if now.After(v.expiresAt) {
					delete(rc.cache, k)
				}
			}
			rc.mu.Unlock()
		}
	}()
}

func generateKey(r *http.Request, goalID string) string {
	body, _ := io.ReadAll(r.Body)
	r.Body = io.NopCloser(bytes.NewBuffer(body))

	h := sha256.New()
	h.Write([]byte(r.Method))
	h.Write([]byte(r.URL.Path))
	h.Write(bytes.TrimSpace(body))
	h.Write([]byte(goalID))
	for k, vals := range r.Header {
		for _, v := range vals {
			h.Write([]byte(k))
			h.Write([]byte(v))
		}
	}
	return fmt.Sprintf("%x", h.Sum(nil))
}

type responseRecorder struct {
	statusCode int
	header     http.Header
	body       []byte
}

func (rw *responseRecorder) Header() http.Header {
	return rw.header
}

func (rw *responseRecorder) Write(b []byte) (int, error) {
	rw.body = append(rw.body, b...)
	return len(b), nil
}

func (rw *responseRecorder) WriteHeader(statusCode int) {
	rw.statusCode = statusCode
}
