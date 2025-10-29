// Types and interfaces for robot simulation

export interface Position {
  x: number;
  y: number;
}

export interface RobotState {
  position: Position;
  orientation: number; // in radians
  velocity: number; // current velocity
  angularVelocity: number; // current angular velocity
}

export interface RobotConstants {
  maxSpeed: number; // maximum linear velocity
  maxAcceleration: number; // maximum acceleration
  wheelbase: number; // distance between wheels
  size: number; // robot size for display (same as wheelbase for now)
}

export interface GridConfig {
  width: number; // grid width in cells
  height: number; // grid height in cells
  cellSize: number; // size of each cell in pixels
}

export interface MovementCommand {
  type: 'forward' | 'backward' | 'turnLeft' | 'turnRight' | 'stop';
  duration?: number; // duration in seconds
}

export interface SimulationState {
  robot: RobotState;
  estimatedRobot: RobotState;
  constants: RobotConstants;
  grid: GridConfig;
  isRunning: boolean;
}