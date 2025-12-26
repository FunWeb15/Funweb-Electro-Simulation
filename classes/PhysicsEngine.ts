import { ChargedObject } from './ChargedObject';
import { Vector2 } from '../utils/Vector2';
import { PHYSICS_CONSTANTS } from '../constants';

export class PhysicsEngine {
  objects: ChargedObject[];
  friction: number;
  bounds: { width: number; height: number };

  constructor() {
    this.objects = [];
    this.friction = 0.01;
    this.bounds = { width: 800, height: 600 };
    // We defer initialization until we know bounds if possible, 
    // but constructor must return a valid state.
    // The App will call initializeDefault again on mount.
    this.initializeDefault();
  }

  initializeDefault() {
    // Dynamic placement based on bounds
    const { width, height } = this.bounds;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Determine safe separation based on screen size
    // Use 60% of the smaller dimension, clamped to [150, 300] pixels
    const minDim = Math.min(width, height);
    const separation = Math.max(150, Math.min(300, minDim * 0.6));
    const halfSep = separation / 2;
    
    // Reset objects centered with optimized mass for simulation (1.0 kg)
    this.objects = [
      new ChargedObject('obj1', centerX - halfSep, centerY, 1.0, 5),
      new ChargedObject('obj2', centerX + halfSep, centerY, 1.0, -5)
    ];
    
    this.friction = 0.01;
  }

  resize(width: number, height: number) {
    // Calculate shift needed to keep objects centered relative to the new bounds
    const dx = (width - this.bounds.width) / 2;
    const dy = (height - this.bounds.height) / 2;
    
    this.bounds = { width, height };

    // Shift all objects and their trails
    this.objects.forEach(obj => {
        obj.position.x += dx;
        obj.position.y += dy;
        
        obj.trail.forEach(pt => {
            pt.x += dx;
            pt.y += dy;
        });
    });
  }

  update(dt: number) {
    // 1. Clear State (Handled in objects internal state management)

    // 2. Compute Forces
    for (let i = 0; i < this.objects.length; i++) {
      for (let j = i + 1; j < this.objects.length; j++) {
        const objA = this.objects[i];
        const objB = this.objects[j];

        const rVec = objB.position.subtract(objA.position);
        let dist = rVec.magnitude();
        
        // Clamp distance to avoid singularity
        dist = Math.max(dist, PHYSICS_CONSTANTS.MIN_DISTANCE);

        const dir = rVec.normalize();

        // F = k * |q1 * q2| / r^2
        const qProduct = objA.charge * objB.charge;
        const forceMag = (PHYSICS_CONSTANTS.K_COULOMB * Math.abs(qProduct)) / (dist * dist);

        let forceOnA: Vector2;
        if (qProduct < 0) {
            // Attract: A moves TOWARDS B
            forceOnA = dir.multiply(forceMag);
        } else if (qProduct > 0) {
            // Repel: A moves AWAY from B
            forceOnA = dir.multiply(-forceMag);
        } else {
            forceOnA = Vector2.zero();
        }

        const forceOnB = forceOnA.multiply(-1); // Newton's 3rd Law

        objA.applyForce(forceOnA);
        objB.applyForce(forceOnB);
      }
    }

    // 3. Update Kinematics
    this.objects.forEach(obj => {
      obj.updatePhysics(dt, this.friction);
      this.resolveBounds(obj);
    });
  }

  resolveBounds(obj: ChargedObject) {
    const padding = obj.radius; // Keep the whole object inside
    
    // Horizontal Constraints
    if (obj.position.x < padding) {
      obj.position.x = padding;
      // Invert velocity (bounce) with energy loss
      if (obj.velocity.x < 0) obj.velocity.x *= -0.5;
    } else if (obj.position.x > this.bounds.width - padding) {
      obj.position.x = this.bounds.width - padding;
      if (obj.velocity.x > 0) obj.velocity.x *= -0.5;
    }

    // Vertical Constraints
    if (obj.position.y < padding) {
      obj.position.y = padding;
      if (obj.velocity.y < 0) obj.velocity.y *= -0.5;
    } else if (obj.position.y > this.bounds.height - padding) {
      obj.position.y = this.bounds.height - padding;
      if (obj.velocity.y > 0) obj.velocity.y *= -0.5;
    }
  }

  // Helper to force distance (used by slider)
  setDistance(dist: number) {
    if (this.objects.length < 2) return;
    const objA = this.objects[0];
    const objB = this.objects[1];
    
    // Calculate center point
    const center = objA.position.add(objB.position).multiply(0.5);
    const halfDist = dist / 2;

    // Use current alignment or default to horizontal
    let dir = objB.position.subtract(objA.position).normalize();
    if (dir.magnitude() === 0) dir = new Vector2(1, 0);

    objA.position = center.subtract(dir.multiply(halfDist));
    objB.position = center.add(dir.multiply(halfDist));
    
    // Stop motion to allow clean repositioning
    objA.velocity = Vector2.zero();
    objB.velocity = Vector2.zero();
    objA.acceleration = Vector2.zero();
    objB.acceleration = Vector2.zero();
    
    // Ensure we don't push them out of bounds immediately
    this.resolveBounds(objA);
    this.resolveBounds(objB);
  }
}