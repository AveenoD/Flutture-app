package lead_sourcing

import (
	"context"
	"fmt"
)

// Provider is the interface every external lead source must implement.
type Provider interface {
	// Name returns the api_provider enum value (e.g. "housing", "99acres").
	Name() string
	// FetchLeads retrieves raw leads from the provider using the given credentials and config.
	FetchLeads(ctx context.Context, creds OrgAPICredentials, config SourcingConfig) ([]RawLead, error)
}

// Registry maps api_provider enum strings to their Provider implementations.
type Registry struct {
	providers map[string]Provider
}

// NewRegistry creates a Registry and registers all built-in providers.
func NewRegistry() *Registry {
	r := &Registry{providers: make(map[string]Provider)}
	r.Register(&HousingProvider{})
	return r
}

// Register adds a provider to the registry.
func (r *Registry) Register(p Provider) {
	r.providers[p.Name()] = p
}

// Get retrieves a provider by its name.
func (r *Registry) Get(name string) (Provider, error) {
	p, ok := r.providers[name]
	if !ok {
		return nil, fmt.Errorf("lead_sourcing: no provider registered for %q", name)
	}
	return p, nil
}
