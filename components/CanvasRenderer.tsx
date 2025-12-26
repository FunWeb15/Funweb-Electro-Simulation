import React, { useRef, useEffect } from 'react';
import { PhysicsEngine } from '../classes/PhysicsEngine';
import { ChargedObject } from '../classes/ChargedObject';
import { Vector2 } from '../utils/Vector2';
import { COLORS, PHYSICS_CONSTANTS } from '../constants';

interface CanvasRendererProps {
  engine: PhysicsEngine;
  showField: boolean;
  fieldSpacing: number; // Pixels between field indicators
  showArrows: boolean;
  forceScale: number; // Multiplier for force arrow length
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({ 
  engine, 
  showField, 
  fieldSpacing, 
  showArrows, 
  forceScale 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);

  const drawField = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!showField) return;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; // Very faint white
    ctx.lineWidth = 1;

    // Grid based loop
    for (let x = 0; x <= width; x += fieldSpacing) {
        for (let y = 0; y <= height; y += fieldSpacing) {
            let Ex = 0;
            let Ey = 0;
            
            // Calculate superposition of fields
            for (const obj of engine.objects) {
                 const dx = x - obj.position.x;
                 const dy = y - obj.position.y;
                 const d2 = dx*dx + dy*dy;
                 const d = Math.sqrt(d2);
                 
                 // Skip if inside object or too close (singularity)
                 if (d < obj.radius * 0.8) continue;

                 // E = k * q / r^2
                 // Vector component: E_x = E * (dx/d) = (k*q/d^2) * (dx/d) = k*q*dx/d^3
                 // We use a simplified k for field visualization to keep numbers manageable
                 // Just need direction relative dominance
                 const contribution = (obj.charge) / (d2 * d);
                 Ex += contribution * dx;
                 Ey += contribution * dy;
            }

            const Emag = Math.sqrt(Ex*Ex + Ey*Ey);
            
            // Draw field vector
            if (Emag > 0.0000001) { // Avoid zero div
                const nx = Ex / Emag;
                const ny = Ey / Emag;
                
                // Length of field line segment
                const len = Math.min(fieldSpacing * 0.7, 20);
                
                const startX = x - nx * len * 0.5;
                const startY = y - ny * len * 0.5;
                const endX = x + nx * len * 0.5;
                const endY = y + ny * len * 0.5;

                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                
                // Draw a tiny arrowhead for direction if spacing allows visibility
                if (fieldSpacing >= 25) {
                    const headSize = 3;
                    // Rotate -135 and +135 degrees from normal
                    // Approx: -0.707
                    // Let's just use simple trig for the head
                    const angle = Math.atan2(ny, nx);
                    ctx.moveTo(endX, endY);
                    ctx.lineTo(endX - headSize * Math.cos(angle - Math.PI / 6), endY - headSize * Math.sin(angle - Math.PI / 6));
                    ctx.moveTo(endX, endY);
                    ctx.lineTo(endX - headSize * Math.cos(angle + Math.PI / 6), endY - headSize * Math.sin(angle + Math.PI / 6));
                }
            }
        }
    }
    ctx.stroke();
  };

  const drawObject = (ctx: CanvasRenderingContext2D, obj: ChargedObject) => {
    const { x, y } = obj.position;
    
    // Determine Color
    let fill = COLORS.NEUTRAL;
    let glow = COLORS.NEUTRAL_GLOW;
    if (obj.charge > 0) {
      fill = COLORS.POSITIVE;
      glow = COLORS.POSITIVE_GLOW;
    } else if (obj.charge < 0) {
      fill = COLORS.NEGATIVE;
      glow = COLORS.NEGATIVE_GLOW;
    }

    // Draw Trail
    if (obj.trail.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = fill;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4;
      ctx.moveTo(obj.trail[0].x, obj.trail[0].y);
      for (let i = 1; i < obj.trail.length; i++) {
        ctx.lineTo(obj.trail[i].x, obj.trail[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // Draw Glow (Glow intensity proportional to charge)
    if (obj.charge !== 0) {
      const glowRadius = obj.radius + Math.abs(obj.charge) * 3;
      const gradient = ctx.createRadialGradient(x, y, obj.radius, x, y, glowRadius);
      gradient.addColorStop(0, glow);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Draw Body
    ctx.beginPath();
    ctx.arc(x, y, obj.radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    
    // Draw Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Label
    ctx.fillStyle = '#fff';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let sign = '';
    if (obj.charge > 0) sign = '+';
    if (obj.charge < 0) sign = '-';
    ctx.fillText(`${sign}${Math.abs(obj.charge)}`, x, y);
  };

  const drawDistanceLine = (ctx: CanvasRenderingContext2D, objA: ChargedObject, objB: ChargedObject) => {
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = COLORS.DISTANCE_LINE;
    ctx.lineWidth = 1;
    ctx.moveTo(objA.position.x, objA.position.y);
    ctx.lineTo(objB.position.x, objB.position.y);
    ctx.stroke();
    ctx.setLineDash([]); // Reset
  };

  const drawForceArrow = (ctx: CanvasRenderingContext2D, objA: ChargedObject, objB: ChargedObject) => {
    if (!showArrows) return;

    // Re-calculate force for visualization
    const rVec = objB.position.subtract(objA.position);
    let dist = rVec.magnitude();
    dist = Math.max(dist, PHYSICS_CONSTANTS.MIN_DISTANCE);
    
    const qProduct = objA.charge * objB.charge;
    if (qProduct === 0) return;

    // Visual scale factor
    const forceMag = (PHYSICS_CONSTANTS.K_COULOMB * Math.abs(qProduct)) / (dist * dist);
    
    // Apply user scale and cap
    const arrowLength = Math.min(forceMag * 1.5 * forceScale, 300); 
    if (arrowLength < 5) return;

    const dir = rVec.normalize();
    let endPos: Vector2;

    if (qProduct > 0) {
      // Repel: Point away from B
       endPos = objA.position.subtract(dir.multiply(arrowLength));
    } else {
      // Attract: Point towards B
       endPos = objA.position.add(dir.multiply(arrowLength));
    }

    // Draw Arrow Line
    ctx.beginPath();
    ctx.strokeStyle = COLORS.ARROW;
    ctx.lineWidth = 3 + Math.sqrt(forceMag) * 0.1; // Width depends on force magnitude only, not visual scale, to keep semantic meaning? Or scale it too? Let's keep width natural.
    ctx.moveTo(objA.position.x, objA.position.y);
    ctx.lineTo(endPos.x, endPos.y);
    ctx.stroke();

    // Arrowhead
    const angle = Math.atan2(endPos.y - objA.position.y, endPos.x - objA.position.x);
    const headLen = 10 + forceScale * 2; // Scale head slightly
    ctx.beginPath();
    ctx.fillStyle = COLORS.ARROW;
    ctx.moveTo(endPos.x, endPos.y);
    ctx.lineTo(endPos.x - headLen * Math.cos(angle - Math.PI / 6), endPos.y - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(endPos.x - headLen * Math.cos(angle + Math.PI / 6), endPos.y - headLen * Math.sin(angle + Math.PI / 6));
    ctx.fill();
    
    // Label text "F"
    ctx.fillStyle = COLORS.ARROW;
    ctx.font = 'bold 12px Inter';
    const midX = (objA.position.x + endPos.x) / 2;
    const midY = (objA.position.y + endPos.y) / 2;
    ctx.fillText("F", midX + 10, midY);
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle Resize
    const { width, height } = engine.bounds;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Clear
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, height);

    // Draw Electric Field (Behind everything)
    drawField(ctx, width, height);

    // Draw Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < width; x += 50) {
        ctx.moveTo(x, 0); ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 50) {
        ctx.moveTo(0, y); ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Draw Distance Line (r)
    if (engine.objects.length >= 2) {
      drawDistanceLine(ctx, engine.objects[0], engine.objects[1]);
    }

    // Draw Force Arrows
    for (let i = 0; i < engine.objects.length; i++) {
        for (let j = i + 1; j < engine.objects.length; j++) {
            drawForceArrow(ctx, engine.objects[i], engine.objects[j]);
            drawForceArrow(ctx, engine.objects[j], engine.objects[i]);
        }
    }

    // Draw Objects
    engine.objects.forEach(obj => drawObject(ctx, obj));

    requestRef.current = requestAnimationFrame(render);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(render);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [engine, showField, fieldSpacing, showArrows, forceScale]);

  return <canvas ref={canvasRef} className="w-full h-full rounded-xl shadow-2xl shadow-slate-950 border border-slate-700" />;
};
