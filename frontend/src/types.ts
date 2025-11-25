// Types and interfaces for robot simulation

export interface Position {
  x: number;
  y: number;
}

export interface WheelState {
  velocity: number; // wheel velocity in radians/second
  rotation: number; // cumulative wheel rotation in radians
}

export interface RobotState {
  position: Position;
  orientation: number; // in radians
  velocity: number; // current velocity
  angularVelocity: number; // current angular velocity
  leftWheel: WheelState;
  rightWheel: WheelState;
}

export interface RobotConstants {
  maxSpeed: number; // maximum linear velocity
  maxAcceleration: number; // maximum acceleration
  wheelbase: number; // distance between wheels
  wheelRadius: number; // radius of each wheel
  size: number; // robot size for display (same as wheelbase for now)
  slippageAmount: number; // slippage factor (0-1, where 0 = no slippage, 1 = high slippage)
}

export interface GridConfig {
  width: number; // grid width in cells
  height: number; // grid height in cells
  cellSize: number; // size of each cell in pixels
}

export interface MovementCommand {
  type: 'forward' | 'backward' | 'turnLeft' | 'turnRight' | 'stop' | 'wheelControl';
  duration?: number; // duration in seconds
  leftWheelVelocity?: number; // for direct wheel control (radians/second)
  rightWheelVelocity?: number; // for direct wheel control (radians/second)
}

export interface SimulationState {
  robot: RobotState;
  estimatedRobot: RobotState;
  constants: RobotConstants;
  grid: GridConfig;
  isRunning: boolean;
}

// Bayes Filter Simulation Types
export interface DoorState {
  isOpen: boolean;
}

export interface SensorProbabilities {
  truePositive: number; // P(sensor=true|door=open)
  trueNegative: number; // P(sensor=false|door=closed)
}

export interface BeliefState {
  doorOpen: number; // P(door=open)
  doorClosed: number; // P(door=closed)
}

export interface SensorReading {
  value: boolean; // true = sensor detects open, false = sensor detects closed
  timestamp: number;
}

export interface BayesFilterState {
  actualDoorState: DoorState;
  sensorProbabilities: SensorProbabilities;
  currentBelief: BeliefState;
  sensorReadings: SensorReading[];
  currentTimeStep: number;
  isRunning: boolean;
}