// Unit conversion utilities
// Conversion factor: 1 meter = 100 pixels (arbitrary but reasonable scale)
export const PIXELS_PER_METER = 100;

/**
 * Convert pixels to meters
 */
export const pixelsToMeters = (pixels: number): number => {
  return pixels / PIXELS_PER_METER;
};

/**
 * Convert meters to pixels
 */
export const metersToPixels = (meters: number): number => {
  return meters * PIXELS_PER_METER;
};

/**
 * Convert pixel velocity to m/s
 */
export const pixelVelocityToMps = (pixelsPerSecond: number): number => {
  return pixelsPerSecond / PIXELS_PER_METER;
};

/**
 * Convert m/s to pixel velocity
 */
export const mpsToPixelVelocity = (metersPerSecond: number): number => {
  return metersPerSecond * PIXELS_PER_METER;
};

/**
 * Convert pixel acceleration to m/s²
 */
export const pixelAccelerationToMps2 = (pixelsPerSecondSquared: number): number => {
  return pixelsPerSecondSquared / PIXELS_PER_METER;
};

/**
 * Convert m/s² to pixel acceleration
 */
export const mps2ToPixelAcceleration = (metersPerSecondSquared: number): number => {
  return metersPerSecondSquared * PIXELS_PER_METER;
};