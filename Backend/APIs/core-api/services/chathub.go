package services

import (
	"sync"

	"crownco/core-api/models"
)

type ChatHub struct {
	mu          sync.RWMutex
	subscribers map[string]map[chan models.ChatEvent]struct{}
}

func NewChatHub() *ChatHub {
	return &ChatHub{
		subscribers: make(map[string]map[chan models.ChatEvent]struct{}),
	}
}

func (h *ChatHub) Subscribe(leadID string) chan models.ChatEvent {
	h.mu.Lock()
	defer h.mu.Unlock()

	ch := make(chan models.ChatEvent, 32)
	if h.subscribers[leadID] == nil {
		h.subscribers[leadID] = make(map[chan models.ChatEvent]struct{})
	}
	h.subscribers[leadID][ch] = struct{}{}
	return ch
}

func (h *ChatHub) Unsubscribe(leadID string, ch chan models.ChatEvent) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if subs, ok := h.subscribers[leadID]; ok {
		delete(subs, ch)
		if len(subs) == 0 {
			delete(h.subscribers, leadID)
		}
	}
	close(ch)
}

func (h *ChatHub) Publish(leadID string, event models.ChatEvent) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if subs, ok := h.subscribers[leadID]; ok {
		for ch := range subs {
			select {
			case ch <- event:
			default:
			}
		}
	}
}
