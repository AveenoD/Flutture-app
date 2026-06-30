package handlers

import (
	"crownco/core-api/models"
	"crownco/core-api/services"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

type TeamHandler struct {
	service   *services.TeamService
	validator *validator.Validate
}

func NewTeamHandler(service *services.TeamService) *TeamHandler {
	return &TeamHandler{
		service:   service,
		validator: validator.New(),
	}
}

// CreateTeam handles team creation
func (h *TeamHandler) CreateTeam(c *fiber.Ctx) error {
	// Get user info from context
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	// Parse request body
	var req models.CreateTeamRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	// Validate request
	if err := h.validator.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Validation failed",
			"errors":  err.Error(),
		})
	}

	// Create team
	team, err := h.service.CreateTeam(c.Context(), userID, userRole, req)
	if err != nil {
		switch err.Error() {
		case "FORBIDDEN":
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success":    false,
				"error_code": "FORBIDDEN",
				"message":    "You don't have permission to create teams",
			})
		case "MANAGER_NOT_FOUND":
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success":    false,
				"error_code": "MANAGER_NOT_FOUND",
				"message":    "Manager not found",
			})
		case "MANAGER_NOT_IN_ORGANIZATION":
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success":    false,
				"error_code": "MANAGER_NOT_IN_ORGANIZATION",
				"message":    "Manager does not belong to your organization",
			})
		case "INVALID_MANAGER_ID":
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success":    false,
				"error_code": "INVALID_MANAGER_ID",
				"message":    "Invalid manager ID format",
			})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "Failed to create team",
				"error":   err.Error(),
			})
		}
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "Team created successfully",
		"data":    team,
	})
}

// UpdateTeam handles team updates
func (h *TeamHandler) UpdateTeam(c *fiber.Ctx) error {
	// Get user info from context
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	// Get team ID from params
	teamID := c.Params("id")

	// Parse request body
	var req models.UpdateTeamRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	// Validate request
	if err := h.validator.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Validation failed",
			"errors":  err.Error(),
		})
	}

	// Update team
	team, err := h.service.UpdateTeam(c.Context(), userID, userRole, teamID, req)
	if err != nil {
		switch err.Error() {
		case "FORBIDDEN":
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success":    false,
				"error_code": "FORBIDDEN",
				"message":    "You don't have permission to update this team",
			})
		case "TEAM_NOT_FOUND":
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success":    false,
				"error_code": "TEAM_NOT_FOUND",
				"message":    "Team not found",
			})
		case "INVALID_TEAM_ID":
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success":    false,
				"error_code": "INVALID_TEAM_ID",
				"message":    "Invalid team ID format",
			})
		case "MANAGER_NOT_FOUND":
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success":    false,
				"error_code": "MANAGER_NOT_FOUND",
				"message":    "Manager not found",
			})
		case "MANAGER_NOT_IN_ORGANIZATION":
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success":    false,
				"error_code": "MANAGER_NOT_IN_ORGANIZATION",
				"message":    "Manager does not belong to your organization",
			})
		case "NO_FIELDS_TO_UPDATE":
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success":    false,
				"error_code": "NO_FIELDS_TO_UPDATE",
				"message":    "No fields provided for update",
			})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "Failed to update team",
			})
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Team updated successfully",
		"data":    team,
	})
}

// AddTeamMember handles adding a member to team
func (h *TeamHandler) AddTeamMember(c *fiber.Ctx) error {
	// Get user info from context
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	// Get team ID from params
	teamID := c.Params("id")

	// Parse request body
	var req models.AddTeamMemberRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	// Validate request
	if err := h.validator.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Validation failed",
			"errors":  err.Error(),
		})
	}

	// Add member
	err := h.service.AddTeamMember(c.Context(), userID, userRole, teamID, req)
	if err != nil {
		switch err.Error() {
		case "FORBIDDEN":
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success":    false,
				"error_code": "FORBIDDEN",
				"message":    "You don't have permission to add team members",
			})
		case "TEAM_NOT_FOUND":
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success":    false,
				"error_code": "TEAM_NOT_FOUND",
				"message":    "Team not found",
			})
		case "USER_NOT_FOUND":
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success":    false,
				"error_code": "USER_NOT_FOUND",
				"message":    "User not found",
			})
		case "USER_NOT_IN_ORGANIZATION":
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success":    false,
				"error_code": "USER_NOT_IN_ORGANIZATION",
				"message":    "User does not belong to your organization",
			})
		case "INVALID_TEAM_ID":
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success":    false,
				"error_code": "INVALID_TEAM_ID",
				"message":    "Invalid team ID format",
			})
		case "INVALID_USER_ID":
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success":    false,
				"error_code": "INVALID_USER_ID",
				"message":    "Invalid user ID format",
			})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "Failed to add team member",
			})
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Member added to team successfully",
	})
}

// RemoveTeamMember handles removing a member from team
func (h *TeamHandler) RemoveTeamMember(c *fiber.Ctx) error {
	// Get user info from context
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	// Get team ID from params
	teamID := c.Params("id")

	// Parse request body
	var req models.RemoveTeamMemberRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid request body",
		})
	}

	// Validate request
	if err := h.validator.Struct(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Validation failed",
			"errors":  err.Error(),
		})
	}

	// Remove member
	err := h.service.RemoveTeamMember(c.Context(), userID, userRole, teamID, req)
	if err != nil {
		switch err.Error() {
		case "FORBIDDEN":
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success":    false,
				"error_code": "FORBIDDEN",
				"message":    "You don't have permission to remove team members",
			})
		case "TEAM_NOT_FOUND":
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success":    false,
				"error_code": "TEAM_NOT_FOUND",
				"message":    "Team not found",
			})
		case "USER_NOT_FOUND":
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success":    false,
				"error_code": "USER_NOT_FOUND",
				"message":    "User not found",
			})
		case "USER_NOT_IN_ORGANIZATION":
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success":    false,
				"error_code": "USER_NOT_IN_ORGANIZATION",
				"message":    "User does not belong to your organization",
			})
		case "USER_NOT_IN_TEAM":
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success":    false,
				"error_code": "USER_NOT_IN_TEAM",
				"message":    "User is not a member of this team",
			})
		case "INVALID_TEAM_ID":
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success":    false,
				"error_code": "INVALID_TEAM_ID",
				"message":    "Invalid team ID format",
			})
		case "INVALID_USER_ID":
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success":    false,
				"error_code": "INVALID_USER_ID",
				"message":    "Invalid user ID format",
			})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "Failed to remove team member",
			})
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"message": "Member removed from team successfully",
	})
}

// GetTeamMembers handles fetching all members of a team
func (h *TeamHandler) GetTeamMembers(c *fiber.Ctx) error {
	// Get user info from context
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	// Get team ID from params
	teamID := c.Params("id")

	// Get members
	members, err := h.service.GetTeamMembers(c.Context(), userID, userRole, teamID)
	if err != nil {
		switch err.Error() {
		case "FORBIDDEN":
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success":    false,
				"error_code": "FORBIDDEN",
				"message":    "You don't have permission to view team members",
			})
		case "TEAM_NOT_FOUND":
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"success":    false,
				"error_code": "TEAM_NOT_FOUND",
				"message":    "Team not found",
			})
		case "INVALID_TEAM_ID":
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"success":    false,
				"error_code": "INVALID_TEAM_ID",
				"message":    "Invalid team ID format",
			})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "Failed to fetch team members",
			})
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"members": members,
			"count":   len(members),
		},
	})
}

// GetAllTeams handles fetching all teams
func (h *TeamHandler) GetAllTeams(c *fiber.Ctx) error {
	// Get user info from context
	userID := c.Locals("user_id").(string)
	userRole := c.Locals("user_role").(string)

	// Get teams
	teams, err := h.service.GetAllTeams(c.Context(), userID, userRole)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to fetch teams",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"teams": teams,
			"count": len(teams),
		},
	})
}
