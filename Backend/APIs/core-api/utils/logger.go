package utils

import (
	"bytes"
	"encoding/json"
	"log"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// RequestResponseLogger logs request and response for every API call with colors.
// - Request line in orange
// - Response line in green
// Bodies are truncated to avoid huge logs.
func RequestResponseLogger() fiber.Handler {
	const maxBodyLen = 4000

	// ANSI colors (for most terminals; safe if not supported – will just show raw text)
	const (
		colorReset  = "\033[0m"
		colorOrange = "\033[38;5;208m" // request
		colorGreen  = "\033[32m"       // response
		colorGrey   = "\033[90m"
	)

	return func(c *fiber.Ctx) error {
		start := time.Now()

		reqBody := prettyBody(c.Body(), maxBodyLen)

		log.Printf(colorGrey+"────────────── REQUEST ──────────────"+colorReset)
		log.Printf(
			colorOrange+"[REQ] %s %s"+colorReset,
			c.Method(),
			c.OriginalURL(),
		)
		if q := c.Context().QueryArgs().String(); q != "" {
			log.Printf(colorGrey+"  Query: %s"+colorReset, q)
		}
		if reqBody != "" {
			log.Printf(colorGrey+"  Body:"+colorReset+"\n%s", indent(reqBody, "    "))
		}

		err := c.Next()

		latency := time.Since(start)
		status := c.Response().StatusCode()
		resBody := prettyBody(c.Response().Body(), maxBodyLen)

		log.Printf(colorGrey+"────────────── RESPONSE ─────────────"+colorReset)
		log.Printf(
			colorGreen+"[RES] %s %s"+colorReset,
			c.Method(),
			c.OriginalURL(),
		)
		log.Printf(colorGrey+"  Status: %d | Latency: %s"+colorReset, status, latency)
		if resBody != "" {
			log.Printf(colorGrey+"  Body:"+colorReset+"\n%s", indent(resBody, "    "))
		}
		log.Printf(colorGrey+"─────────────────────────────────────"+colorReset)

		return err
	}
}

// prettyBody tries to pretty-print JSON; falls back to string. Truncates if too long.
func prettyBody(b []byte, maxLen int) string {
	if len(b) == 0 {
		return ""
	}
	raw := bytes.TrimSpace(b)
	if len(raw) == 0 {
		return ""
	}

	var buf bytes.Buffer
	if json.Valid(raw) {
		if err := json.Indent(&buf, raw, "", "  "); err == nil {
			raw = buf.Bytes()
		}
	}

	s := string(raw)
	if len(s) > maxLen {
		s = s[:maxLen] + "...(truncated)"
	}
	return s
}

// indent prefixes each non-empty line with the given prefix.
func indent(s, prefix string) string {
	lines := strings.Split(s, "\n")
	for i, line := range lines {
		if line != "" {
			lines[i] = prefix + line
		}
	}
	return strings.Join(lines, "\n")
}


