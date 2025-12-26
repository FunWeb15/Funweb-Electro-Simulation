export interface Vector2D {
  x: number;
  y: number;
}

export interface IChargedObject {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  acceleration: Vector2D;
  mass: number;
  charge: number; // -10 to 10
  radius: number;
  isLocked: boolean; // Position locked
  trail: Vector2D[];
}

export interface SimulationState {
  objects: IChargedObject[];
  time: number;
  dt: number;
  isPlaying: boolean;
  friction: number; // 0 to 0.1
  canvasBounds: { width: number; height: number };
}

export interface PhysicsParams {
  k: number; // Coulomb constant scaler
  pixelRatio: number; // Meters to pixels rough conversion for visuals
}