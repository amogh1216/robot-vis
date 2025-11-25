import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  wsService, 
  StateUpdatePayload, 
  SimulationStatusPayload,
  BackendRobotConstants 
} from '../services/websocket';
import { RobotState, RobotConstants } from '../types';

// Scale factor: backend uses meters, frontend uses pixels
// 1 meter = 100 pixels (adjust as needed)
const SCALE = 100;

// Offset to center the robot on the canvas
const CANVAS_OFFSET_X = 400; // Half of grid width
const CANVAS_OFFSET_Y = 325; // Half of grid height

interface UseSimulationWebSocketReturn {
  isConnected: boolean;
  isRunning: boolean;
  groundTruth: RobotState | null;
  odometry: RobotState | null;
  backendConstants: BackendRobotConstants | null;
  error: string | null;
  sendWheelCommand: (leftVelocity: number, rightVelocity: number) => void;
  sendConstants: (constants: RobotConstants) => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
}

// Convert backend robot state to frontend format
function backendToFrontendState(backend: StateUpdatePayload['groundTruth'] | StateUpdatePayload['odometry']): RobotState {
  return {
    position: {
      // Convert from meters to pixels and offset to center
      x: backend.x * SCALE + CANVAS_OFFSET_X,
      y: backend.y * SCALE + CANVAS_OFFSET_Y,
    },
    orientation: backend.theta,
    velocity: backend.linearVel * SCALE, // Convert m/s to pixels/s
    angularVelocity: backend.angularVel,
    leftWheel: {
      velocity: backend.leftWheel.velocity,
      rotation: backend.leftWheel.rotation,
    },
    rightWheel: {
      velocity: backend.rightWheel.velocity,
      rotation: backend.rightWheel.rotation,
    },
  };
}

// Convert frontend constants to backend format
function frontendToBackendConstants(frontend: RobotConstants): BackendRobotConstants {
  return {
    wheelBase: frontend.wheelbase / SCALE, // Convert pixels to meters
    wheelRadius: frontend.wheelRadius / SCALE,
    maxSpeed: frontend.maxSpeed / SCALE, // Convert pixels/s to m/s
    maxAccel: frontend.maxAcceleration / SCALE,
    slippageAmount: frontend.slippageAmount,
  };
}

export function useSimulationWebSocket(): UseSimulationWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [groundTruth, setGroundTruth] = useState<RobotState | null>(null);
  const [odometry, setOdometry] = useState<RobotState | null>(null);
  const [backendConstants, setBackendConstants] = useState<BackendRobotConstants | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Track if we've connected before to avoid duplicate connections
  const hasConnected = useRef(false);

  useEffect(() => {
    if (hasConnected.current) return;
    hasConnected.current = true;

    wsService.connect({
      onConnectionChange: (connected) => {
        setIsConnected(connected);
        if (!connected) {
          setError('Disconnected from server');
        } else {
          setError(null);
        }
      },
      onStateUpdate: (payload: StateUpdatePayload) => {
        setGroundTruth(backendToFrontendState(payload.groundTruth));
        setOdometry(backendToFrontendState(payload.odometry));
        setBackendConstants(payload.constants);
      },
      onSimulationStatus: (payload: SimulationStatusPayload) => {
        console.log('Hook received simulation status, setting isRunning to:', payload.running);
        setIsRunning(payload.running);
      },
      onError: (code, message) => {
        setError(`${code}: ${message}`);
        console.error('WebSocket error:', code, message);
      },
    });

    return () => {
      wsService.disconnect();
      hasConnected.current = false;
    };
  }, []);

  const sendWheelCommand = useCallback((leftVelocity: number, rightVelocity: number) => {
    wsService.sendWheelCommand(leftVelocity, rightVelocity);
  }, []);

  const sendConstants = useCallback((constants: RobotConstants) => {
    wsService.sendUpdateConstants(frontendToBackendConstants(constants));
  }, []);

  const startSimulation = useCallback(() => {
    wsService.startSimulation();
  }, []);

  const stopSimulation = useCallback(() => {
    wsService.stopSimulation();
  }, []);

  const resetSimulation = useCallback(() => {
    wsService.resetSimulation();
  }, []);

  return {
    isConnected,
    isRunning,
    groundTruth,
    odometry,
    backendConstants,
    error,
    sendWheelCommand,
    sendConstants,
    startSimulation,
    stopSimulation,
    resetSimulation,
  };
}
