package services

import (
	"context"
	"encoding/json"
	"fmt"

	"crownco/core-api/database"
	"crownco/core-api/models"
)

// ============================================
// CACHE HELPER METHODS
// ============================================

// cacheProject caches a project
func (s *ProjectService) cacheProject(projectID string, project *models.ProjectResponse) {
	ctx := context.Background()
	cacheKey := fmt.Sprintf(projectCacheKey, projectID)
	
	if projectJSON, err := json.Marshal(project); err == nil {
		database.RedisClient.Set(ctx, cacheKey, projectJSON, cacheExpiry)
	}
}

// cacheUnit caches a unit
func (s *ProjectService) cacheUnit(projectID, unitID string, unit *models.UnitResponse) {
	ctx := context.Background()
	cacheKey := fmt.Sprintf("unit:%s", unitID)
	
	if unitJSON, err := json.Marshal(unit); err == nil {
		database.RedisClient.Set(ctx, cacheKey, unitJSON, cacheExpiry)
	}
}

// cacheAddon caches an addon
func (s *ProjectService) cacheAddon(projectID, addonID string, addon *models.AddonResponse) {
	ctx := context.Background()
	cacheKey := fmt.Sprintf("addon:%s", addonID)
	
	if addonJSON, err := json.Marshal(addon); err == nil {
		database.RedisClient.Set(ctx, cacheKey, addonJSON, cacheExpiry)
	}
}

// invalidateProjectCache invalidates all project-related cache
func (s *ProjectService) invalidateProjectCache(projectID string) {
	ctx := context.Background()
	
	// Invalidate project cache
	projectKey := fmt.Sprintf(projectCacheKey, projectID)
	database.RedisClient.Del(ctx, projectKey)
	
	// Invalidate project stats cache
	statsKey := fmt.Sprintf(projectStatsCacheKey, projectID)
	database.RedisClient.Del(ctx, statsKey)
}

// invalidateUnitCache invalidates unit cache
func (s *ProjectService) invalidateUnitCache(projectID, unitID string) {
	ctx := context.Background()
	
	// Invalidate unit cache
	unitKey := fmt.Sprintf("unit:%s", unitID)
	database.RedisClient.Del(ctx, unitKey)
}

// invalidateAddonCache invalidates addon cache
func (s *ProjectService) invalidateAddonCache(projectID, addonID string) {
	ctx := context.Background()
	
	// Invalidate addon cache
	addonKey := fmt.Sprintf("addon:%s", addonID)
	database.RedisClient.Del(ctx, addonKey)
}

// invalidateProjectStatsCache invalidates project stats cache
func (s *ProjectService) invalidateProjectStatsCache(projectID string) {
	ctx := context.Background()
	
	// Invalidate stats cache
	statsKey := fmt.Sprintf(projectStatsCacheKey, projectID)
	database.RedisClient.Del(ctx, statsKey)
	
	// Also invalidate project cache (as it contains unit/addon counts)
	projectKey := fmt.Sprintf(projectCacheKey, projectID)
	database.RedisClient.Del(ctx, projectKey)
}
