import { IChargedObject, Vector2D } from '../types';
import { Vector2 } from '../utils/Vector2';
import { PHYSICS_CONSTANTS } from '../constants';

export class ChargedObject implements IChargedObject {
  id: string;
  position: Vector2;
  velocity: Vector2;
  acceleration: Vector2;
  mass: number;
  charge: number;
  radius: number;
  isLocked: boolean;
  trail: Vector2D[];
  private trailTimer: number = 0;

  constructor(id: string, x: number, y: number, mass: number = 5, charge: number = 0) {
    this.id = id;
    this.position = new Vector2(x, y);
    this.velocity = Vector2.zero();
    this.acceleration = Vector2.zero();
    this.mass = mass;
    this.charge = charge;
    this.radius = 20 + Math.sqrt(mass) * 2; // Radius proportional to mass slightly
    this.isLocked = false;
    this.trail = [];
  }

  applyForce(force: Vector2) {
    // F = ma -> a = F/m
    if (this.isLocked) return;
    const accel = force.multiply(1 / this.mass);
    this.acceleration = this.acceleration.add(accel);
  }

  updatePhysics(dt: number, friction: number) {
    if (this.isLocked) {
        this.velocity = Vector2.zero();
        this.acceleration = Vector2.zero();
        return;
    }

    // Apply friction: v = v * (1 - mu * dt)
    // We clamp friction factor to avoid instability if dt is large
    const frictionFactor = Math.max(0, 1 - friction * dt * 60); // Normalized to 60fps
    this.velocity = this.velocity.multiply(frictionFactor);

    // Update velocity: v = v + a * dt
    this.velocity = this.velocity.add(this.acceleration.multiply(dt));

    // Update position: p = p + v * dt
    this.position = this.position.add(this.velocity.multiply(dt));

    // Reset acceleration for next frame
    this.acceleration = Vector2.zero();

    // Update trail
    this.trailTimer++;
    if (this.trailTimer >= PHYSICS_CONSTANTS.TRAIL_UPDATE_FREQ) {
      this.trail.push({ x: this.position.x, y: this.position.y });
      if (this.trail.length > PHYSICS_CONSTANTS.MAX_TRAIL_LENGTH) {
        this.trail.shift();
      }
      this.trailTimer = 0;
    }
  }

  reset(x: number, y: number) {
    this.position = new Vector2(x, y);
    this.velocity = Vector2.zero();
    this.acceleration = Vector2.zero();
    this.trail = [];
  }
}