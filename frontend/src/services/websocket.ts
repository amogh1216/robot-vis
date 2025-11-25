// WebSocket service for connecting to the simulation engine backend

// Backend WebSocket message types
export const WS_MESSAGE_TYPES = {
  // Client -> Server
  WHEEL_COMMAND: 'wheelCommand',
  UPDATE_CONSTANTS: 'updateConstants',
  START_SIMULATION: 'startSimulation',
  STOP_SIMULATION: 'stopSimulation',
  RESET_SIMULATION: 'resetSimulation',

  // Server -> Client
  STATE_UPDATE: 'stateUpdate',
  ERROR: 'error',
  SESSION_CREATED: 'sessionCreated',
  SIMULATION_STATUS: 'simulationStatus',
} as const;

// Backend state types (matching Go models)
export interface BackendWheelState {
  velocity: number;
  rotation: number;
}

export interface BackendRobotState {
  x: number;
  y: number;
  theta: number;
  linearVel: number;
  angularVel: number;
  leftWheel: BackendWheelState;
  rightWheel: BackendWheelState;
  timestamp?: string;
}

export interface BackendOdometryEstimate {
  x: number;
  y: number;
  theta: number;
  linearVel: number;
  angularVel: number;
  leftWheel: BackendWheelState;
  rightWheel: BackendWheelState;
}

export interface BackendRobotConstants {
  wheelBase: number;
  wheelRadius: number;
  maxSpeed: number;
  maxAccel: number;
  slippageAmount: number;
}

export interface StateUpdatePayload {
  groundTruth: BackendRobotState;
  odometry: BackendOdometryEstimate;
  constants: BackendRobotConstants;
  timestamp: number;
}

export interface SimulationStatusPayload {
  running: boolean;
  sessionId: string;
}

export interface WSMessage {
  type: string;
  payload?: unknown;
}

export interface WheelCommandPayload {
  leftVelocity: number;
  rightVelocity: number;
}

export type WebSocketEventHandler = {
  onStateUpdate?: (payload: StateUpdatePayload) => void;
  onSimulationStatus?: (payload: SimulationStatusPayload) => void;
  onError?: (code: string, message: string) => void;
  onConnectionChange?: (connected: boolean) => void;
};

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: WebSocketEventHandler = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isIntentionallyClosed = false;

  constructor(url: string = 'ws://localhost:3001/ws') {
    this.url = url;
  }

  connect(handlers: WebSocketEventHandler): void {
    this.handlers = handlers;
    this.isIntentionallyClosed = false;
    this.createConnection();
  }

  private createConnection(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.handlers.onConnectionChange?.(true);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.handlers.onConnectionChange?.(false);

      if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
        setTimeout(() => this.createConnection(), this.reconnectDelay * this.reconnectAttempts);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }

  private handleMessage(message: WSMessage): void {
    // Log all messages except state updates (too frequent)
    if (message.type !== WS_MESSAGE_TYPES.STATE_UPDATE) {
      console.log('Received message:', message.type, message.payload);
    }
    
    switch (message.type) {
      case WS_MESSAGE_TYPES.STATE_UPDATE:
        // Don't log every state update - too noisy
        this.handlers.onStateUpdate?.(message.payload as StateUpdatePayload);
        break;

      case WS_MESSAGE_TYPES.SIMULATION_STATUS:
        console.log('Received simulationStatus:', message.payload);
        this.handlers.onSimulationStatus?.(message.payload as SimulationStatusPayload);
        break;

      case WS_MESSAGE_TYPES.ERROR:
        const errorPayload = message.payload as { code: string; message: string };
        this.handlers.onError?.(errorPayload.code, errorPayload.message);
        break;

      case WS_MESSAGE_TYPES.SESSION_CREATED:
        console.log('Session created:', message.payload);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private send(message: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  // Client -> Server commands
  sendWheelCommand(leftVelocity: number, rightVelocity: number): void {
    this.send({
      type: WS_MESSAGE_TYPES.WHEEL_COMMAND,
      payload: { leftVelocity, rightVelocity } as WheelCommandPayload,
    });
  }

  sendUpdateConstants(constants: BackendRobotConstants): void {
    this.send({
      type: WS_MESSAGE_TYPES.UPDATE_CONSTANTS,
      payload: constants,
    });
  }

  startSimulation(): void {
    console.log('Sending startSimulation message');
    this.send({ type: WS_MESSAGE_TYPES.START_SIMULATION });
  }

  stopSimulation(): void {
    console.log('Sending stopSimulation message');
    this.send({ type: WS_MESSAGE_TYPES.STOP_SIMULATION });
  }

  resetSimulation(): void {
    this.send({ type: WS_MESSAGE_TYPES.RESET_SIMULATION });
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.ws?.close();
    this.ws = null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const wsService = new WebSocketService();

export default WebSocketService;
