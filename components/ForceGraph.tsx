import React, { useRef, useEffect } from 'react';
import { PHYSICS_CONSTANTS, COLORS } from '../constants';

interface ForceGraphProps {
  distance: number; // Current distance (px)
  q1: number;
  q2: number;
  width?: number;
  height?: number;
}

export const ForceGraph: React.FC<ForceGraphProps> = ({ 
  distance, 
  q1, 
  q2, 
  width = 280, 
  height = 120 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#1e293b'; // slate-800
    ctx.fillRect(0, 0, width, height);

    // Layout Constants
    const padLeft = 40; // Increased for Y-axis numbers
    const padBottom = 20;
    const padRight = 10;
    const padTop = 15; // Increased for top label
    const graphW = width - padLeft - padRight;
    const graphH = height - padTop - padBottom;

    // Data Ranges
    const minX = PHYSICS_CONSTANTS.MIN_DISTANCE;
    const maxX = PHYSICS_CONSTANTS.MAX_DISTANCE;
    
    // Calculate Max Force for Y-Axis scaling
    // We use the current charge product to define the curve height
    const qProduct = Math.abs(q1 * q2);
    
    // Handle Zero Charge Case
    if (qProduct < 0.1) {
        ctx.strokeStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(padLeft, height - padBottom);
        ctx.lineTo(width - padRight, height - padBottom);
        ctx.stroke();
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText("Zero Charge = Zero Force", width / 2, height / 2);
        return;
    }

    // Determine Y-axis max (Force at minimum distance)
    const maxTheoreticalForce = (PHYSICS_CONSTANTS.K_COULOMB * qProduct) / (minX * minX);
    
    // Mapping Functions
    const mapX = (x: number) => padLeft + ((x - minX) / (maxX - minX)) * graphW;
    // Linear Y mapping might hide detail for 1/r^2. 
    // But standard graphs are linear axes usually. 1/r^2 drops off fast.
    const mapY = (f: number) => (padTop + graphH) - (f / maxTheoreticalForce) * graphH;

    // --- Draw Axes ---
    ctx.strokeStyle = '#475569'; // slate-600
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, height - padBottom);
    ctx.lineTo(width - padRight, height - padBottom);
    ctx.stroke();

    // --- Axis Labels (Text) ---
    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.font = '10px Inter';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Y-Axis Ticks
    // Top
    ctx.fillText(maxTheoreticalForce.toFixed(0), padLeft - 6, padTop);
    // Middle
    ctx.fillText((maxTheoreticalForce / 2).toFixed(0), padLeft - 6, padTop + graphH / 2);
    // Bottom
    ctx.fillText('0', padLeft - 6, height - padBottom);

    // X-Axis Ticks
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(minX.toString(), padLeft, height - padBottom + 4);
    ctx.fillText(maxX.toString(), padLeft + graphW, height - padBottom + 4);
    
    // Axis Names
    ctx.font = 'italic 10px Inter';
    ctx.fillText('r (px)', width / 2 + padLeft/2, height - padBottom + 4);

    // --- Draw Curve ---
    ctx.beginPath();
    ctx.strokeStyle = COLORS.POSITIVE; // Blue-500
    ctx.lineWidth = 2;

    const step = 2;
    for (let x = minX; x <= maxX; x += step) {
      const f = (PHYSICS_CONSTANTS.K_COULOMB * qProduct) / (x * x);
      const px = mapX(x);
      const py = mapY(f);
      if (x === minX) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // --- Draw Current State Point ---
    // Clamp distance for visualization
    const clampedDist = Math.max(minX, Math.min(maxX, distance));
    const currentF = (PHYSICS_CONSTANTS.K_COULOMB * qProduct) / (clampedDist * clampedDist);
    
    const cx = mapX(clampedDist);
    const cy = mapY(currentF);

    // Guide Lines
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#fbbf24'; // Amber
    ctx.lineWidth = 1;
    // Vertical down
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, height - padBottom);
    // Horizontal left
    ctx.moveTo(cx, cy);
    ctx.lineTo(padLeft, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Point Glow
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
    ctx.fill();

    // Point Center
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();

    // --- Floating Value Label ---
    // Decide position based on where the point is to avoid clipping
    const labelX = cx + 10 > width - 60 ? cx - 70 : cx + 10;
    const labelY = cy - 15 < padTop ? cy + 25 : cy - 15;

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(`${currentF.toFixed(0)} N`, labelX, labelY);

  }, [distance, q1, q2, width, height]);

  return (
    <div className="flex flex-col items-center bg-slate-900 rounded-lg border border-slate-700 p-2 shadow-inner">
        <canvas ref={canvasRef} width={width} height={height} className="rounded" />
    </div>
  );
};
