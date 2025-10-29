import { RobotState, RobotConstants, Position, MovementCommand } from './types';

/**
 * Calculate turning radius based on wheelbase and current velocity
 */
export const calculateTurningRadius = (wheelbase: number, velocity: number): number => {
  if (velocity === 0) return Infinity;
  // For differential drive: turning radius = wheelbase / 2 when one wheel is stationary
  // This is a simplified model - in reality it depends on the speed difference between wheels
  return Math.max(wheelbase / 2, wheelbase);
};

/**
 * Update robot position based on current state and time delta
 */
export const updateRobotPosition = (
  state: RobotState,
  constants: RobotConstants,
  deltaTime: number
): RobotState => {
  const newState = { ...state };

  // Apply deadband filter to prevent jittering
  const velocityDeadband = 0.005; // Very small threshold
  const angularDeadband = 0.005;
  
  const filteredVelocity = Math.abs(state.velocity) < velocityDeadband ? 0 : state.velocity;
  const filteredAngularVelocity = Math.abs(state.angularVelocity) < angularDeadband ? 0 : state.angularVelocity;

  // Update position based on filtered velocity and orientation
  const deltaX = filteredVelocity * Math.cos(state.orientation) * deltaTime;
  const deltaY = filteredVelocity * Math.sin(state.orientation) * deltaTime;

  newState.position = {
    x: state.position.x + deltaX,
    y: state.position.y + deltaY
  };

  // Update orientation based on filtered angular velocity
  newState.orientation = state.orientation + filteredAngularVelocity * deltaTime;

  // Apply the filtered values to the state
  newState.velocity = filteredVelocity;
  newState.angularVelocity = filteredAngularVelocity;

  // Normalize orientation to [0, 2π]
  newState.orientation = ((newState.orientation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);

  return newState;
};

/**
 * Apply movement command to robot state
 */
export const applyMovementCommand = (
  state: RobotState,
  constants: RobotConstants,
  command: MovementCommand,
  deltaTime: number
): RobotState => {
  const newState = { ...state };
  const { maxSpeed, maxAcceleration } = constants;

  switch (command.type) {
    case 'forward':
      // Accelerate forward up to max speed
      newState.velocity = Math.min(
        state.velocity + maxAcceleration * deltaTime,
        maxSpeed
      );
      newState.angularVelocity = 0;
      break;

    case 'backward':
      // Accelerate backward up to max speed
      newState.velocity = Math.max(
        state.velocity - maxAcceleration * deltaTime,
        -maxSpeed
      );
      newState.angularVelocity = 0;
      break;

    case 'turnLeft':
      // Turn left while maintaining some forward velocity
      newState.velocity = Math.max(state.velocity * 0.7, maxSpeed * 0.3);
      newState.angularVelocity = -(maxSpeed * 0.6) / constants.wheelbase; // reduced turning speed
      break;

    case 'turnRight':
      // Turn right while maintaining some forward velocity
      newState.velocity = Math.max(state.velocity * 0.7, maxSpeed * 0.3);
      newState.angularVelocity = (maxSpeed * 0.6) / constants.wheelbase; // reduced turning speed
      break;

    case 'stop':
      // Immediate stop - no deceleration to avoid oscillation
      newState.velocity = 0;
      newState.angularVelocity = 0;
      break;
  }

  return newState;
};

/**
 * Check if robot position is within grid boundaries
 */
export const isWithinBounds = (
  position: Position,
  robotSize: number,
  gridWidth: number,
  gridHeight: number
): boolean => {
  const halfSize = robotSize / 2;
  return (
    position.x >= halfSize &&
    position.x <= gridWidth - halfSize &&
    position.y >= halfSize &&
    position.y <= gridHeight - halfSize
  );
};

/**
 * Constrain robot position to stay within grid boundaries
 */
export const constrainToBounds = (
  position: Position,
  robotSize: number,
  gridWidth: number,
  gridHeight: number
): Position => {
  const halfSize = robotSize / 2;
  return {
    x: Math.max(halfSize, Math.min(position.x, gridWidth - halfSize)),
    y: Math.max(halfSize, Math.min(position.y, gridHeight - halfSize))
  };
};