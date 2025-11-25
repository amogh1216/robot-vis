package models

// WheelCommand represents a command to set wheel velocities
type WheelCommand struct {
	LeftVelocity  float64 `json:"leftVelocity"`  // Left wheel angular velocity in rad/s
	RightVelocity float64 `json:"rightVelocity"` // Right wheel angular velocity in rad/s
}

// WSMessage is the generic WebSocket message structure
type WSMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload,omitempty"`
}

// WSMessageType constants for WebSocket communication
const (
	// Client -> Server
	MsgTypeWheelCommand    = "wheelCommand"
	MsgTypeUpdateConstants = "updateConstants"
	MsgTypeStartSimulation = "startSimulation"
	MsgTypeStopSimulation  = "stopSimulation"
	MsgTypeResetSimulation = "resetSimulation"

	// Server -> Client
	MsgTypeStateUpdate      = "stateUpdate"
	MsgTypeError            = "error"
	MsgTypeSessionCreated   = "sessionCreated"
	MsgTypeSimulationStatus = "simulationStatus"
)

// StateUpdatePayload is sent to clients with current state
type StateUpdatePayload struct {
	GroundTruth RobotState       `json:"groundTruth"`
	Odometry    OdometryEstimate `json:"odometry"`
	Constants   RobotConstants   `json:"constants"`
	Timestamp   int64            `json:"timestamp"` // Unix timestamp ms
}

// ErrorPayload contains error information
type ErrorPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// SimulationStatusPayload indicates if simulation is running
type SimulationStatusPayload struct {
	Running   bool   `json:"running"`
	SessionID string `json:"sessionId"`
}
