package models

import "time"

// WheelState represents the state of a single wheel
type WheelState struct {
	Velocity float64 `json:"velocity"` // Angular velocity in rad/s
	Rotation float64 `json:"rotation"` // Total rotation in radians
}

// RobotState represents the current state of the robot
type RobotState struct {
	X          float64    `json:"x"`          // Position X in meters
	Y          float64    `json:"y"`          // Position Y in meters
	Theta      float64    `json:"theta"`      // Orientation in radians
	LinearVel  float64    `json:"linearVel"`  // Linear velocity in m/s
	AngularVel float64    `json:"angularVel"` // Angular velocity in rad/s
	LeftWheel  WheelState `json:"leftWheel"`  // Left wheel state
	RightWheel WheelState `json:"rightWheel"` // Right wheel state
	Timestamp  time.Time  `json:"timestamp"`  // Time of this state
}

// OdometryEstimate represents the estimated state from odometry
type OdometryEstimate struct {
	X          float64    `json:"x"`
	Y          float64    `json:"y"`
	Theta      float64    `json:"theta"`
	LinearVel  float64    `json:"linearVel"`
	AngularVel float64    `json:"angularVel"`
	LeftWheel  WheelState `json:"leftWheel"`
	RightWheel WheelState `json:"rightWheel"`
}

// RobotConstants holds the physical parameters of the robot
type RobotConstants struct {
	WheelBase      float64 `json:"wheelBase"`      // Distance between wheels in meters
	WheelRadius    float64 `json:"wheelRadius"`    // Wheel radius in meters
	MaxSpeed       float64 `json:"maxSpeed"`       // Maximum linear speed in m/s
	MaxAccel       float64 `json:"maxAccel"`       // Maximum acceleration in m/s²
	SlippageAmount float64 `json:"slippageAmount"` // Slippage noise factor (0-1)
}

// SimulationState contains all simulation data
type SimulationState struct {
	GroundTruth RobotState       `json:"groundTruth"`
	Odometry    OdometryEstimate `json:"odometry"`
	Constants   RobotConstants   `json:"constants"`
	SessionID   string           `json:"sessionId"`
	Running     bool             `json:"running"`
	DeltaTime   float64          `json:"deltaTime"` // Time step in seconds
}

// DefaultRobotConstants returns default robot parameters
func DefaultRobotConstants() RobotConstants {
	return RobotConstants{
		WheelBase:      0.3,  // 30cm between wheels
		WheelRadius:    0.05, // 5cm wheel radius
		MaxSpeed:       2.0,  // 2 m/s max
		MaxAccel:       1.0,  // 1 m/s² acceleration
		SlippageAmount: 0.1,  // 10% slippage factor
	}
}

// Session represents a simulation session in the database
type Session struct {
	ID        string         `json:"id"`
	CreatedAt time.Time      `json:"createdAt"`
	EndedAt   *time.Time     `json:"endedAt,omitempty"`
	Constants RobotConstants `json:"constants"`
}

// TrajectoryPoint represents a single point in the robot's trajectory
type TrajectoryPoint struct {
	Timestamp     time.Time `json:"timestamp"`
	TrueX         float64   `json:"trueX"`
	TrueY         float64   `json:"trueY"`
	TrueTheta     float64   `json:"trueTheta"`
	EstX          float64   `json:"estX"`
	EstY          float64   `json:"estY"`
	EstTheta      float64   `json:"estTheta"`
	LeftWheelVel  float64   `json:"leftWheelVel"`
	RightWheelVel float64   `json:"rightWheelVel"`
}
