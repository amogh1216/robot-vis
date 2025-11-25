package simulation

import (
	"log"
	"math"
	"math/rand"
	"sync"
	"time"

	"github.com/amogh1216/robot-vis/sim_engine/internal/models"
)

// Engine handles the robot simulation logic
type Engine struct {
	GroundTruth  models.RobotState
	Odometry     models.OdometryEstimate
	Constants    models.RobotConstants
	LastUpdate   time.Time
	Running      bool
	WheelCommand models.WheelCommand
	rand         *rand.Rand
}

// NewEngine creates a new simulation engine
func NewEngine() *Engine {
	constants := models.DefaultRobotConstants()
	now := time.Now()

	return &Engine{
		GroundTruth: models.RobotState{
			X:          0,
			Y:          0,
			Theta:      0,
			LinearVel:  0,
			AngularVel: 0,
			LeftWheel:  models.WheelState{Velocity: 0, Rotation: 0},
			RightWheel: models.WheelState{Velocity: 0, Rotation: 0},
			Timestamp:  now,
		},
		Odometry: models.OdometryEstimate{
			X:          0,
			Y:          0,
			Theta:      0,
			LinearVel:  0,
			AngularVel: 0,
			LeftWheel:  models.WheelState{Velocity: 0, Rotation: 0},
			RightWheel: models.WheelState{Velocity: 0, Rotation: 0},
		},
		Constants:    constants,
		LastUpdate:   now,
		Running:      false,
		WheelCommand: models.WheelCommand{LeftVelocity: 0, RightVelocity: 0},
		rand:         rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// SetWheelCommand updates the target wheel velocities
func (e *Engine) SetWheelCommand(cmd models.WheelCommand) {
	e.WheelCommand = cmd
}

// UpdateConstants updates the robot's physical parameters
func (e *Engine) UpdateConstants(constants models.RobotConstants) {
	e.Constants = constants
}

// Reset resets the simulation to initial state
func (e *Engine) Reset() {
	now := time.Now()
	e.GroundTruth = models.RobotState{
		X:          0,
		Y:          0,
		Theta:      0,
		LinearVel:  0,
		AngularVel: 0,
		LeftWheel:  models.WheelState{Velocity: 0, Rotation: 0},
		RightWheel: models.WheelState{Velocity: 0, Rotation: 0},
		Timestamp:  now,
	}
	e.Odometry = models.OdometryEstimate{
		X:          0,
		Y:          0,
		Theta:      0,
		LinearVel:  0,
		AngularVel: 0,
		LeftWheel:  models.WheelState{Velocity: 0, Rotation: 0},
		RightWheel: models.WheelState{Velocity: 0, Rotation: 0},
	}
	e.LastUpdate = now
	e.WheelCommand = models.WheelCommand{LeftVelocity: 0, RightVelocity: 0}
}

// Step advances the simulation by one time step
func (e *Engine) Step(dt float64) {
	startTime := time.Now()
	defer func() {
		elapsed := time.Since(startTime)
		log.Printf("Engine.Step() took %v", elapsed)
	}()

	if dt <= 0 {
		return
	}

	// Update wheel velocities toward commanded velocities with acceleration limits
	e.updateWheelVelocities(dt)

	// Calculate robot velocities from wheel velocities
	linearVel, angularVel := e.wheelVelocitiesToRobotVelocities(
		e.GroundTruth.LeftWheel.Velocity,
		e.GroundTruth.RightWheel.Velocity,
	)

	// Run ground truth and odometry updates concurrently
	var wg sync.WaitGroup
	wg.Add(2)

	// Ground truth update (with slippage)
	go func() {
		defer wg.Done()
		e.updateGroundTruth(linearVel, angularVel, dt)
	}()

	// Odometry update (no slippage)
	go func() {
		defer wg.Done()
		e.updateOdometry(dt)
	}()

	wg.Wait()

	e.GroundTruth.Timestamp = time.Now()
	e.LastUpdate = e.GroundTruth.Timestamp
}

// updateGroundTruth updates the ground truth state with slippage
func (e *Engine) updateGroundTruth(linearVel, angularVel, dt float64) {
	// Apply slippage to velocities (ground truth only)
	slippedLinearVel, slippedAngularVel := e.applySlippage(linearVel, angularVel, dt)

	// Update ground truth position with slippage
	e.GroundTruth.LinearVel = slippedLinearVel
	e.GroundTruth.AngularVel = slippedAngularVel
	e.updatePosition(&e.GroundTruth, slippedLinearVel, slippedAngularVel, dt)

	// Update wheel rotations based on actual wheel velocities
	e.GroundTruth.LeftWheel.Rotation += e.GroundTruth.LeftWheel.Velocity * dt
	e.GroundTruth.RightWheel.Rotation += e.GroundTruth.RightWheel.Velocity * dt
}

// updateWheelVelocities smoothly updates wheel velocities toward target
func (e *Engine) updateWheelVelocities(dt float64) {
	// Calculate max velocity change based on acceleration limit
	// Convert linear acceleration to angular acceleration for wheel
	maxAngularAccel := e.Constants.MaxAccel / e.Constants.WheelRadius
	maxDeltaVel := maxAngularAccel * dt

	// Update left wheel velocity
	leftDiff := e.WheelCommand.LeftVelocity - e.GroundTruth.LeftWheel.Velocity
	if math.Abs(leftDiff) > maxDeltaVel {
		if leftDiff > 0 {
			e.GroundTruth.LeftWheel.Velocity += maxDeltaVel
		} else {
			e.GroundTruth.LeftWheel.Velocity -= maxDeltaVel
		}
	} else {
		e.GroundTruth.LeftWheel.Velocity = e.WheelCommand.LeftVelocity
	}

	// Update right wheel velocity
	rightDiff := e.WheelCommand.RightVelocity - e.GroundTruth.RightWheel.Velocity
	if math.Abs(rightDiff) > maxDeltaVel {
		if rightDiff > 0 {
			e.GroundTruth.RightWheel.Velocity += maxDeltaVel
		} else {
			e.GroundTruth.RightWheel.Velocity -= maxDeltaVel
		}
	} else {
		e.GroundTruth.RightWheel.Velocity = e.WheelCommand.RightVelocity
	}
}

// wheelVelocitiesToRobotVelocities converts wheel angular velocities to robot linear/angular velocities
func (e *Engine) wheelVelocitiesToRobotVelocities(leftWheelVel, rightWheelVel float64) (linearVel, angularVel float64) {
	// Differential drive kinematics:
	// v = R/2 * (ωL + ωR)
	// ω = R/L * (ωL - ωR)
	// where R = wheel radius, L = wheelbase, ωL/ωR = left/right wheel angular velocities
	linearVel = (e.Constants.WheelRadius / 2.0) * (leftWheelVel + rightWheelVel)
	angularVel = (e.Constants.WheelRadius / e.Constants.WheelBase) * (leftWheelVel - rightWheelVel)

	// clip to [-maxSpeed, maxSpeed]
	if linearVel > e.Constants.MaxSpeed {
		linearVel = e.Constants.MaxSpeed
	} else if linearVel < -e.Constants.MaxSpeed {
		linearVel = -e.Constants.MaxSpeed
	}

	if angularVel > e.Constants.MaxSpeed {
		angularVel = e.Constants.MaxSpeed
	} else if angularVel < -e.Constants.MaxSpeed {
		angularVel = -e.Constants.MaxSpeed
	}

	return
}

// applySlippage adds noise to velocities proportional to speed and acceleration
func (e *Engine) applySlippage(linearVel, angularVel, dt float64) (slippedLinear, slippedAngular float64) {

	linearNoise := (e.rand.NormFloat64() - 0.5) * 0.1
	angularNoise := (e.rand.NormFloat64() - 0.5) * 0.05

	slippedLinear = linearVel * (1 - (e.Constants.SlippageAmount+linearNoise)*0.3)
	slippedAngular = angularVel * (1 - (e.Constants.SlippageAmount+angularNoise)*0.03)
	return
}

// updatePosition updates position based on velocities (Euler integration)
func (e *Engine) updatePosition(state *models.RobotState, linearVel, angularVel, dt float64) {
	// For small angular velocities, use straight-line approximation
	if math.Abs(angularVel) < 1e-6 {
		state.X += linearVel * math.Cos(state.Theta) * dt
		state.Y += linearVel * math.Sin(state.Theta) * dt
	} else {
		// Arc-based motion for non-zero angular velocity
		// More accurate than simple Euler integration
		radius := linearVel / angularVel
		dTheta := angularVel * dt
		state.X += radius * (math.Sin(state.Theta+dTheta) - math.Sin(state.Theta))
		state.Y += radius * (-math.Cos(state.Theta+dTheta) + math.Cos(state.Theta))
		state.Theta += dTheta
	}

	// Normalize theta to [0, 2π)
	state.Theta = normalizeAngle(state.Theta)
}

// updateOdometry updates the odometry estimate based on wheel rotations
func (e *Engine) updateOdometry(dt float64) {
	// Odometry uses the commanded/ideal wheel velocities (no slippage)
	// This simulates reading from wheel encoders

	// Update odometry wheel velocities (track commanded velocities)
	e.Odometry.LeftWheel.Velocity = e.GroundTruth.LeftWheel.Velocity
	e.Odometry.RightWheel.Velocity = e.GroundTruth.RightWheel.Velocity

	// Update odometry wheel rotations
	e.Odometry.LeftWheel.Rotation += e.Odometry.LeftWheel.Velocity * dt
	e.Odometry.RightWheel.Rotation += e.Odometry.RightWheel.Velocity * dt

	// Calculate robot velocities from wheel velocities
	linearVel, angularVel := e.wheelVelocitiesToRobotVelocities(
		e.Odometry.LeftWheel.Velocity,
		e.Odometry.RightWheel.Velocity,
	)

	e.Odometry.LinearVel = linearVel
	e.Odometry.AngularVel = angularVel

	// Update odometry position (no slippage)
	if math.Abs(angularVel) < 1e-6 {
		e.Odometry.X += linearVel * math.Cos(e.Odometry.Theta) * dt
		e.Odometry.Y += linearVel * math.Sin(e.Odometry.Theta) * dt
	} else {
		radius := linearVel / angularVel
		dTheta := angularVel * dt
		e.Odometry.X += radius * (math.Sin(e.Odometry.Theta+dTheta) - math.Sin(e.Odometry.Theta))
		e.Odometry.Y += radius * (-math.Cos(e.Odometry.Theta+dTheta) + math.Cos(e.Odometry.Theta))
		e.Odometry.Theta += dTheta
	}

	e.Odometry.Theta = normalizeAngle(e.Odometry.Theta)
}

// normalizeAngle keeps angle in [0, 2π)
func normalizeAngle(theta float64) float64 {
	twoPi := 2 * math.Pi
	for theta < 0 {
		theta += twoPi
	}
	for theta >= twoPi {
		theta -= twoPi
	}
	return theta
}

// GetState returns the current simulation state
func (e *Engine) GetState() (models.RobotState, models.OdometryEstimate) {
	return e.GroundTruth, e.Odometry
}
