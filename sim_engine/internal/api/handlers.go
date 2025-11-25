package api

import (
	"encoding/json"
	"net/http"

	"github.com/amogh1216/robot-vis/sim_engine/internal/models"
	"github.com/amogh1216/robot-vis/sim_engine/internal/websocket"
)

// Handler handles API requests
type Handler struct {
	hub *websocket.Hub
}

// NewHandler creates a new API handler
func NewHandler(hub *websocket.Hub) *Handler {
	return &Handler{
		hub: hub,
	}
}

// HealthCheck returns the server health status
func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	response := map[string]interface{}{
		"status":  "ok",
		"service": "robot-simulation-engine",
		"running": h.hub.IsRunning(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// UpdateConstants updates robot constants
func (h *Handler) UpdateConstants(w http.ResponseWriter, r *http.Request) {
	var constants models.RobotConstants
	if err := json.NewDecoder(r.Body).Decode(&constants); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate constants
	if constants.WheelBase <= 0 || constants.WheelRadius <= 0 {
		http.Error(w, "Invalid constants: wheelBase and wheelRadius must be positive", http.StatusBadRequest)
		return
	}

	// Update engine constants
	engine := h.hub.GetEngine()
	engine.UpdateConstants(constants)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}
