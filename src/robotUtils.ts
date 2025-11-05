import { RobotState, RobotConstants, Position, MovementCommand, WheelState } from './types';

/**
 * Convert wheel velocities to robot linear and angular velocities
 * Using differential drive kinematics
 */
export const wheelVelocitiesToRobotVelocities = (
  leftWheelVel: number,
  rightWheelVel: number,
  wheelRadius: number,
  wheelbase: number
): { linearVelocity: number; angularVelocity: number } => {
  // Convert wheel velocities (rad/s) to linear velocities (m/s or pixels/s)
  const leftLinearVel = leftWheelVel * wheelRadius;
  const rightLinearVel = rightWheelVel * wheelRadius;
  
  // Robot linear velocity is average of wheel velocities
  const linearVelocity = (leftLinearVel + rightLinearVel) / 2;
  
  // Robot angular velocity from wheel velocity difference
  // Positive angular velocity = counterclockwise rotation (left turn)
  const angularVelocity = (rightLinearVel - leftLinearVel) / wheelbase;
  
  return { linearVelocity, angularVelocity };
};

/**
 * Convert robot velocities to individual wheel velocities
 * Using differential drive kinematics
 */
export const robotVelocitiesToWheelVelocities = (
  linearVelocity: number,
  angularVelocity: number,
  wheelRadius: number,
  wheelbase: number
): { leftWheelVel: number; rightWheelVel: number } => {
  // Calculate wheel linear velocities
  const leftLinearVel = linearVelocity - (angularVelocity * wheelbase) / 2;
  const rightLinearVel = linearVelocity + (angularVelocity * wheelbase) / 2;
  
  // Convert to wheel angular velocities (rad/s)
  const leftWheelVel = leftLinearVel / wheelRadius;
  const rightWheelVel = rightLinearVel / wheelRadius;
  
  return { leftWheelVel, rightWheelVel };
};

/**
 * Update wheel rotations based on wheel velocities
 */
export const updateWheelRotations = (
  leftWheel: WheelState,
  rightWheel: WheelState,
  deltaTime: number
): { leftWheel: WheelState; rightWheel: WheelState } => {
  return {
    leftWheel: {
      velocity: leftWheel.velocity,
      rotation: leftWheel.rotation + leftWheel.velocity * deltaTime
    },
    rightWheel: {
      velocity: rightWheel.velocity,
      rotation: rightWheel.rotation + rightWheel.velocity * deltaTime
    }
  };
};

/**
 * Calculate odometry-based position estimate from wheel rotations
 */
export const calculateOdometryPosition = (
  previousPosition: Position,
  previousOrientation: number,
  leftWheelDelta: number,
  rightWheelDelta: number,
  wheelRadius: number,
  wheelbase: number
): { position: Position; orientation: number } => {
  // Convert wheel rotation deltas to distances
  const leftDistance = leftWheelDelta * wheelRadius;
  const rightDistance = rightWheelDelta * wheelRadius;
  
  // Calculate forward distance and orientation change
  const forwardDistance = (leftDistance + rightDistance) / 2;
  const orientationChange = (rightDistance - leftDistance) / wheelbase;
  
  // Update orientation
  const newOrientation = previousOrientation + orientationChange;
  
  // Calculate position change in robot frame, then transform to world frame
  const deltaX = forwardDistance * Math.cos(previousOrientation + orientationChange / 2);
  const deltaY = forwardDistance * Math.sin(previousOrientation + orientationChange / 2);
  
  return {
    position: {
      x: previousPosition.x + deltaX,
      y: previousPosition.y + deltaY
    },
    orientation: ((newOrientation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI) // Keep positive [0, 2π]
  };
};

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
 * Update robot position based on wheel states and time delta
 */
export const updateRobotPosition = (
  state: RobotState,
  constants: RobotConstants,
  deltaTime: number
): RobotState => {
  const newState = { ...state };

  // Apply deadband filter to prevent jittering
  const velocityDeadband = 0.005; // Very small threshold
  
  const filteredLeftWheelVel = Math.abs(state.leftWheel.velocity) < velocityDeadband ? 0 : state.leftWheel.velocity;
  const filteredRightWheelVel = Math.abs(state.rightWheel.velocity) < velocityDeadband ? 0 : state.rightWheel.velocity;

  // Update wheel rotations
  const updatedWheels = updateWheelRotations(
    { ...state.leftWheel, velocity: filteredLeftWheelVel },
    { ...state.rightWheel, velocity: filteredRightWheelVel },
    deltaTime
  );

  newState.leftWheel = updatedWheels.leftWheel;
  newState.rightWheel = updatedWheels.rightWheel;

  // Convert wheel velocities to robot velocities
  const robotVelocities = wheelVelocitiesToRobotVelocities(
    filteredLeftWheelVel,
    filteredRightWheelVel,
    constants.wheelRadius,
    constants.wheelbase
  );

  newState.velocity = robotVelocities.linearVelocity;
  newState.angularVelocity = robotVelocities.angularVelocity;

  // Apply slippage model - random variation proportional to acceleration and speed
  const velocityChange = Math.abs(newState.velocity - state.velocity);
  const accelerationMagnitude = velocityChange / deltaTime;
  const speedFactor = Math.abs(newState.velocity);
  
  // Slippage is proportional to both acceleration and current speed
  const slippageFactor = constants.slippageAmount * (accelerationMagnitude + speedFactor * 0.1);
  
  // Apply slippage to velocities for smoother, more natural movement
  const linearSlippage = (Math.random() - 0.5) * slippageFactor * 0.1; // Small linear velocity variation
  const angularSlippage = (Math.random() - 0.5) * slippageFactor * 0.05; // Small angular velocity variation
  
  // Add slippage to velocities
  const actualLinearVelocity = newState.velocity + linearSlippage;
  const actualAngularVelocity = newState.angularVelocity + angularSlippage;

  // Update position based on actual velocities (with slippage)
  const deltaX = actualLinearVelocity * Math.cos(state.orientation) * deltaTime;
  const deltaY = actualLinearVelocity * Math.sin(state.orientation) * deltaTime;

  newState.position = {
    x: state.position.x + deltaX,
    y: state.position.y + deltaY
  };

  // Update orientation based on actual angular velocity (with slippage)
  newState.orientation = state.orientation + actualAngularVelocity * deltaTime;

  // Normalize orientation to [0, 2π]
  newState.orientation = ((newState.orientation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);

  return newState;
};

/**
 * Apply movement command to robot state using wheel-based control
 */
export const applyMovementCommand = (
  state: RobotState,
  constants: RobotConstants,
  command: MovementCommand,
  deltaTime: number
): RobotState => {
  const newState = { ...state };
  const { maxSpeed, maxAcceleration, wheelRadius, wheelbase } = constants;

  // Convert max speed to max wheel velocity
  const maxWheelVelocity = maxSpeed / wheelRadius;
  const maxWheelAcceleration = maxAcceleration / wheelRadius;

  let targetLeftWheelVel = state.leftWheel.velocity;
  let targetRightWheelVel = state.rightWheel.velocity;

  switch (command.type) {
    case 'forward':
      // Both wheels move forward at equal speed
      targetLeftWheelVel = maxWheelVelocity;
      targetRightWheelVel = maxWheelVelocity;
      break;

    case 'backward':
      // Both wheels move backward at equal speed
      targetLeftWheelVel = -maxWheelVelocity;
      targetRightWheelVel = -maxWheelVelocity;
      break;

    case 'turnLeft':
      // Turn left (counterclockwise): right wheel faster, left wheel slower
      targetLeftWheelVel = maxWheelVelocity * 0.5;
      targetRightWheelVel = -maxWheelVelocity * 0.5;
      break;

    case 'turnRight':
      // Turn right (clockwise): left wheel faster, right wheel slower  
      targetLeftWheelVel = -maxWheelVelocity * 0.5;
      targetRightWheelVel = maxWheelVelocity * 0.5;
      break;

    case 'stop':
      targetLeftWheelVel = 0;
      targetRightWheelVel = 0;
      break;

    case 'wheelControl':
      // Direct wheel velocity control
      if (command.leftWheelVelocity !== undefined) {
        targetLeftWheelVel = Math.max(-maxWheelVelocity, Math.min(maxWheelVelocity, command.leftWheelVelocity));
      }
      if (command.rightWheelVelocity !== undefined) {
        targetRightWheelVel = Math.max(-maxWheelVelocity, Math.min(maxWheelVelocity, command.rightWheelVelocity));
      }
      break;
  }

  // Apply acceleration limits to wheel velocities
  const leftWheelDiff = targetLeftWheelVel - state.leftWheel.velocity;
  const rightWheelDiff = targetRightWheelVel - state.rightWheel.velocity;

  const maxWheelDelta = maxWheelAcceleration * deltaTime;

  newState.leftWheel = {
    ...state.leftWheel,
    velocity: state.leftWheel.velocity + Math.max(-maxWheelDelta, Math.min(maxWheelDelta, leftWheelDiff))
  };

  newState.rightWheel = {
    ...state.rightWheel,
    velocity: state.rightWheel.velocity + Math.max(-maxWheelDelta, Math.min(maxWheelDelta, rightWheelDiff))
  };

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

/**
 * Update odometry estimate based on wheel encoder readings
 */
export const updateOdometryEstimate = (
  currentEstimate: RobotState,
  actualRobot: RobotState,
  constants: RobotConstants,
  deltaTime: number
): RobotState => {
  // Calculate wheel rotation deltas from actual robot
  const leftWheelDelta = actualRobot.leftWheel.velocity * deltaTime;
  const rightWheelDelta = actualRobot.rightWheel.velocity * deltaTime;

  // Calculate new position and orientation using odometry
  const odometryResult = calculateOdometryPosition(
    currentEstimate.position,
    currentEstimate.orientation,
    leftWheelDelta,
    rightWheelDelta,
    constants.wheelRadius,
    constants.wheelbase
  );

  // Update the estimated state
  return {
    ...currentEstimate,
    position: odometryResult.position,
    orientation: ((odometryResult.orientation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI), // Keep positive [0, 2π]
    leftWheel: {
      velocity: actualRobot.leftWheel.velocity,
      rotation: currentEstimate.leftWheel.rotation + leftWheelDelta
    },
    rightWheel: {
      velocity: actualRobot.rightWheel.velocity,
      rotation: currentEstimate.rightWheel.rotation + rightWheelDelta
    },
    velocity: actualRobot.velocity,
    angularVelocity: actualRobot.angularVelocity
  };
};