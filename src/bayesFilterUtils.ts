import { BeliefState, SensorProbabilities, SensorReading } from './types';

/**
 * Generate a sensor reading based on actual door state and sensor probabilities
 * This simulates the noisy sensor behavior
 */
export const generateSensorReading = (
  actualDoorOpen: boolean,
  sensorProbs: SensorProbabilities
): boolean => {
  const random = Math.random();
  
  if (actualDoorOpen) {
    // Door is actually open - return true with probability of true positive
    return random < sensorProbs.truePositive;
  } else {
    // Door is actually closed - return false with probability of true negative
    return random >= sensorProbs.trueNegative;
  }
};

/**
 * Update belief using Bayes' theorem
 * This is the core of the Bayes filter algorithm
 */
export const updateBelief = (
  priorBelief: BeliefState,
  sensorReading: boolean,
  sensorProbs: SensorProbabilities
): BeliefState => {
  // BAYES FILTER MATH - All calculations clearly commented
  
  // Prior probabilities
  const P_door_open = priorBelief.doorOpen;
  const P_door_closed = priorBelief.doorClosed;
  
  // Sensor model probabilities
  const P_sensor_true_given_open = sensorProbs.truePositive;
  const P_sensor_false_given_open = 1 - sensorProbs.truePositive;
  const P_sensor_true_given_closed = 1 - sensorProbs.trueNegative;
  const P_sensor_false_given_closed = sensorProbs.trueNegative;
  
  let likelihood_open: number;
  let likelihood_closed: number;
  
  if (sensorReading) {
    // Sensor reading is TRUE (detects open)
    likelihood_open = P_sensor_true_given_open;
    likelihood_closed = P_sensor_true_given_closed;
  } else {
    // Sensor reading is FALSE (detects closed)
    likelihood_open = P_sensor_false_given_open;
    likelihood_closed = P_sensor_false_given_closed;
  }
  
  // Calculate unnormalized posterior probabilities
  const unnormalized_posterior_open = likelihood_open * P_door_open;
  const unnormalized_posterior_closed = likelihood_closed * P_door_closed;
  
  // Normalization constant (total probability)
  const normalization = unnormalized_posterior_open + unnormalized_posterior_closed;
  
  // Normalized posterior probabilities (this is our new belief)
  const posterior_open = unnormalized_posterior_open / normalization;
  const posterior_closed = unnormalized_posterior_closed / normalization;
  
  return {
    doorOpen: posterior_open,
    doorClosed: posterior_closed
  };
};

/**
 * Initialize belief state with user-provided prior
 */
export const initializeBelief = (priorDoorOpenProbability: number): BeliefState => {
  return {
    doorOpen: priorDoorOpenProbability,
    doorClosed: 1 - priorDoorOpenProbability
  };
};

/**
 * Format probability as percentage string
 */
export const formatProbability = (prob: number): string => {
  return `${(prob * 100).toFixed(1)}%`;
};