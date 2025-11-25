package websocket

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/amogh1216/robot-vis/sim_engine/internal/models"
	"github.com/amogh1216/robot-vis/sim_engine/internal/simulation"
	"github.com/google/uuid"
)

// Hub maintains active clients and broadcasts messages
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Inbound messages from clients
	broadcast chan []byte

	// Register requests from clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Simulation engine
	engine *simulation.Engine

	// Simulation loop control
	running   bool
	stopChan  chan struct{}
	sessionID string

	// Mutex for thread-safe operations
	mu sync.RWMutex
}

// NewHub creates a new Hub
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		engine:     simulation.NewEngine(),
		running:    false,
		stopChan:   make(chan struct{}),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			log.Printf("Client connected. Total clients: %d", len(h.clients))
			// Send current state to new client
			h.sendStateToClient(client)

		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				log.Printf("Client disconnected. Total clients: %d", len(h.clients))
			}

		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}

// HandleMessage processes incoming WebSocket messages
func (h *Hub) HandleMessage(client *Client, messageData []byte) {
	log.Printf("Received raw message: %s", string(messageData))

	var msg models.WSMessage
	if err := json.Unmarshal(messageData, &msg); err != nil {
		log.Printf("Error unmarshaling message: %v", err)
		h.sendError(client, "INVALID_MESSAGE", "Failed to parse message")
		return
	}

	log.Printf("Parsed message type: %s", msg.Type)

	switch msg.Type {
	case models.MsgTypeWheelCommand:
		h.handleWheelCommand(msg.Payload)

	case models.MsgTypeUpdateConstants:
		h.handleUpdateConstants(msg.Payload)

	case models.MsgTypeStartSimulation:
		h.handleStartSimulation()

	case models.MsgTypeStopSimulation:
		h.handleStopSimulation()

	case models.MsgTypeResetSimulation:
		h.handleResetSimulation()

	default:
		log.Printf("Unknown message type: %s", msg.Type)
		h.sendError(client, "UNKNOWN_TYPE", "Unknown message type: "+msg.Type)
	}
}

func (h *Hub) handleWheelCommand(payload interface{}) {
	data, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Error marshaling wheel command: %v", err)
		return
	}

	var cmd models.WheelCommand
	if err := json.Unmarshal(data, &cmd); err != nil {
		log.Printf("Error unmarshaling wheel command: %v", err)
		return
	}

	h.mu.Lock()
	h.engine.SetWheelCommand(cmd)
	h.mu.Unlock()
}

func (h *Hub) handleUpdateConstants(payload interface{}) {
	data, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Error marshaling constants: %v", err)
		return
	}

	var constants models.RobotConstants
	if err := json.Unmarshal(data, &constants); err != nil {
		log.Printf("Error unmarshaling constants: %v", err)
		return
	}

	h.mu.Lock()
	h.engine.UpdateConstants(constants)
	h.mu.Unlock()
}

func (h *Hub) handleStartSimulation() {
	h.mu.Lock()
	if h.running {
		h.mu.Unlock()
		return
	}

	h.running = true
	h.stopChan = make(chan struct{})
	h.sessionID = uuid.New().String()
	h.mu.Unlock()

	// Broadcast session created
	h.broadcastMessage(models.WSMessage{
		Type: models.MsgTypeSessionCreated,
		Payload: map[string]string{
			"sessionId": h.sessionID,
		},
	})

	// Broadcast simulation status
	h.broadcastSimulationStatus()

	// Start simulation loop
	go h.simulationLoop()

	log.Printf("Simulation started with session ID: %s", h.sessionID)
}

func (h *Hub) handleStopSimulation() {
	h.mu.Lock()
	if !h.running {
		h.mu.Unlock()
		return
	}

	h.running = false
	close(h.stopChan)
	h.mu.Unlock()

	// Broadcast simulation status
	h.broadcastSimulationStatus()

	log.Println("Simulation stopped")
}

func (h *Hub) handleResetSimulation() {
	wasRunning := h.running
	if wasRunning {
		h.handleStopSimulation()
	}

	h.mu.Lock()
	h.engine.Reset()
	h.mu.Unlock()

	// Broadcast new state
	h.broadcastState()

	log.Println("Simulation reset")
}

// simulationLoop runs the simulation at fixed time steps
func (h *Hub) simulationLoop() {
	const targetFPS = 120
	const dt = 1.0 / float64(targetFPS)
	ticker := time.NewTicker(time.Duration(1000/targetFPS) * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-h.stopChan:
			return
		case <-ticker.C:
			h.mu.Lock()
			h.engine.Step(dt)
			h.mu.Unlock()

			// Broadcast state to all clients
			h.broadcastState()
		}
	}
}

// broadcastState sends current state to all clients
func (h *Hub) broadcastState() {
	h.mu.RLock()
	gt, odom := h.engine.GetState()
	constants := h.engine.Constants
	h.mu.RUnlock()

	payload := models.StateUpdatePayload{
		GroundTruth: gt,
		Odometry:    odom,
		Constants:   constants,
		Timestamp:   time.Now().UnixMilli(),
	}

	h.broadcastMessage(models.WSMessage{
		Type:    models.MsgTypeStateUpdate,
		Payload: payload,
	})
}

// broadcastSimulationStatus sends simulation status to all clients
func (h *Hub) broadcastSimulationStatus() {
	h.mu.RLock()
	running := h.running
	sessionID := h.sessionID
	h.mu.RUnlock()

	log.Printf("Broadcasting simulation status: running=%v, sessionID=%s", running, sessionID)

	h.broadcastMessage(models.WSMessage{
		Type: models.MsgTypeSimulationStatus,
		Payload: models.SimulationStatusPayload{
			Running:   running,
			SessionID: sessionID,
		},
	})
}

// broadcastMessage sends a message to all connected clients
func (h *Hub) broadcastMessage(msg models.WSMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}

	h.broadcast <- data
}

// sendStateToClient sends current state to a specific client
func (h *Hub) sendStateToClient(client *Client) {
	h.mu.RLock()
	gt, odom := h.engine.GetState()
	constants := h.engine.Constants
	running := h.running
	sessionID := h.sessionID
	h.mu.RUnlock()

	// Send current state
	stateMsg := models.WSMessage{
		Type: models.MsgTypeStateUpdate,
		Payload: models.StateUpdatePayload{
			GroundTruth: gt,
			Odometry:    odom,
			Constants:   constants,
			Timestamp:   time.Now().UnixMilli(),
		},
	}

	data, err := json.Marshal(stateMsg)
	if err != nil {
		log.Printf("Error marshaling state: %v", err)
		return
	}

	select {
	case client.send <- data:
	default:
	}

	// Send simulation status
	statusMsg := models.WSMessage{
		Type: models.MsgTypeSimulationStatus,
		Payload: models.SimulationStatusPayload{
			Running:   running,
			SessionID: sessionID,
		},
	}

	data, err = json.Marshal(statusMsg)
	if err != nil {
		log.Printf("Error marshaling status: %v", err)
		return
	}

	select {
	case client.send <- data:
	default:
	}
}

// sendError sends an error message to a specific client
func (h *Hub) sendError(client *Client, code, message string) {
	msg := models.WSMessage{
		Type: models.MsgTypeError,
		Payload: models.ErrorPayload{
			Code:    code,
			Message: message,
		},
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Error marshaling error message: %v", err)
		return
	}

	select {
	case client.send <- data:
	default:
	}
}

// GetEngine returns the simulation engine (for API handlers)
func (h *Hub) GetEngine() *simulation.Engine {
	return h.engine
}

// IsRunning returns whether the simulation is running
func (h *Hub) IsRunning() bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.running
}
