import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { PhysicsEngine } from './classes/PhysicsEngine';
import { CanvasRenderer } from './components/CanvasRenderer';
import { Slider } from './components/Slider';
import { Button } from './components/Button';
import { ForceGraph } from './components/ForceGraph';
import { RotateCcw, Zap, Play, Square, Activity, Eye, MoveDiagonal } from 'lucide-react';
import { PHYSICS_CONSTANTS } from './constants';
import { clsx } from 'clsx';

// Initialize engine once
const engine = new PhysicsEngine();

const App: React.FC = () => {
  const [dummyTick, setDummyTick] = useState(0); 
  const [isPlaying, setIsPlaying] = useState(true);
  const [controlsWidth, setControlsWidth] = useState(300);

  // Visualization States
  const [showField, setShowField] = useState(false);
  const [fieldDensity, setFieldDensity] = useState(40); // Pixel Spacing (Lower is denser)
  const [showArrows, setShowArrows] = useState(true);
  const [forceScale, setForceScale] = useState(1.0);

  // References to objects for UI binding
  const obj1 = engine.objects[0];
  const obj2 = engine.objects[1];

  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // Physics Loop
  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05); // Cap dt
      lastTime = time;

      if (isPlaying) {
        engine.update(dt);
      }
      
      // Update UI @ 30fps max to save React cycles
      if (Math.floor(time) % 2 === 0) {
         setDummyTick(t => t + 1);
      }
      
      frameId = requestAnimationFrame(loop);
    };
    
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying]);

  // Resize Handler & Initial Placement
  useLayoutEffect(() => {
    const handleResize = () => {
        if (!containerRef.current) return;
        
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;

        if (controlsRef.current) {
            // Update controls width for the ForceGraph
            setControlsWidth(controlsRef.current.clientWidth - 42); // Subtract padding
        }

        if (!initialized.current) {
            // First time setup
            engine.bounds = { width: w, height: h };
            if (w > 0) {
                 engine.initializeDefault();
                 initialized.current = true;
            }
        } else {
            // Subsequent resize: Shift content to stay centered
            engine.resize(w, h);
        }
    };

    window.addEventListener('resize', handleResize);
    // Call immediately
    handleResize();
    
    // Double check shortly after mount for layout shifts (mobile browser bars)
    setTimeout(handleResize, 100);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleReset = () => {
    engine.initializeDefault();
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 50);
  };

  const handleGround = (index: number) => {
    const obj = engine.objects[index];
    if (!obj) return;
    
    const interval = setInterval(() => {
        if (Math.abs(obj.charge) < 0.1) {
            obj.charge = 0;
            clearInterval(interval);
        } else {
            obj.charge *= 0.8;
        }
    }, 50);
  };

  // Helper Calculations for Readouts
  const currentDist = obj1 && obj2 ? obj1.position.distanceTo(obj2.position) : 0;
  
  // Calculate Force Magnitude for display (F = k|q1q2|/r^2)
  const calculateForceMag = () => {
    if (!obj1 || !obj2) return 0;
    const qProduct = Math.abs(obj1.charge * obj2.charge);
    const dist = Math.max(currentDist, PHYSICS_CONSTANTS.MIN_DISTANCE);
    return (PHYSICS_CONSTANTS.K_COULOMB * qProduct) / (dist * dist);
  };
  const currentForce = calculateForceMag();

  // Dynamic styling helpers
  const getObjectStyles = (charge: number) => {
    if (charge > 0) return { border: 'border-blue-500', text: 'text-blue-400' };
    if (charge < 0) return { border: 'border-red-500', text: 'text-red-400' };
    return { border: 'border-slate-500', text: 'text-slate-400' };
  };

  const style1 = obj1 ? getObjectStyles(obj1.charge) : { border: '', text: '' };
  const style2 = obj2 ? getObjectStyles(obj2.charge) : { border: '', text: '' };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-slate-900 overflow-hidden">
      {/* Left (or Top): Canvas Area */}
      <div 
        ref={containerRef} 
        className="flex-grow relative order-1 md:h-full h-[55%] w-full overflow-hidden border-b md:border-b-0 md:border-r border-slate-700 bg-slate-950"
      >
        <CanvasRenderer 
            engine={engine} 
            showField={showField}
            fieldSpacing={fieldDensity}
            showArrows={showArrows}
            forceScale={forceScale}
        />
        
        {/* Overlay Title */}
        <div className="absolute top-4 left-4 pointer-events-none select-none">
            <h1 className="text-xl md:text-2xl font-bold text-white drop-shadow-md">ElectroStatic Lab</h1>
            <p className="text-slate-400 text-xs md:text-sm">Free Exploration Mode</p>
        </div>

        {/* Global Stats Overlay - Repositioned for mobile safely */}
        <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-700 p-2 md:p-3 rounded-lg text-[10px] md:text-xs font-mono text-slate-300 pointer-events-none select-none shadow-xl">
           <div className="flex justify-between gap-3 md:gap-4">
             <span>Separation (r):</span>
             <span className="text-white">{currentDist.toFixed(0)} px</span>
           </div>
           <div className="flex justify-between gap-3 md:gap-4">
             <span>Force (F):</span>
             <span className="text-yellow-400">{currentForce.toFixed(1)} N</span>
           </div>
        </div>
      </div>

      {/* Right (or Bottom): Controls Area */}
      <div 
        ref={controlsRef}
        className="flex-shrink-0 w-full md:w-[350px] order-2 h-[45%] md:h-full flex flex-col gap-4 overflow-y-auto bg-slate-900 p-4 shadow-2xl z-10"
      >
        
        {/* Main Control Box + Force Graph */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg shrink-0">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                    <Zap className="text-yellow-400 w-4 h-4 fill-yellow-400" />
                    Global Controls
                </h2>
                <div className="flex gap-2">
                    <Button 
                        variant="secondary" 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="!p-1.5 h-8 w-8"
                        title={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? <Square className="w-3.5 h-3.5 fill-slate-200" /> : <Play className="w-3.5 h-3.5 fill-slate-200" />}
                    </Button>
                    <Button variant="danger" onClick={handleReset} className="!p-1.5 h-8 w-8" title="Reset">
                        <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {/* Force Graph Canvas */}
            <div className="mb-4 flex justify-center">
                <ForceGraph 
                    distance={currentDist} 
                    q1={obj1 ? obj1.charge : 0} 
                    q2={obj2 ? obj2.charge : 0} 
                    width={Math.max(280, controlsWidth)} // Responsive width
                    height={100}
                />
            </div>

            <div className="space-y-4">
                 <Slider 
                    label="Separation" 
                    min={60} max={500} step={5} 
                    value={Math.round(currentDist)} 
                    onChange={(v) => engine.setDistance(v)}
                    unit="px"
                 />
                 <Slider 
                    label="Friction" 
                    min={0} max={0.1} step={0.005} 
                    value={parseFloat(engine.friction.toFixed(3))} 
                    onChange={(v) => engine.friction = v}
                 />

                 <div className="h-px bg-slate-700 my-4" />

                 {/* Visualization Controls */}
                 <div className="space-y-4">
                    {/* Electric Field Control */}
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                             <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                                <Eye className="w-4 h-4 text-blue-400" />
                                <span>Electric Field</span>
                             </div>
                             <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={showField}
                                    onChange={(e) => setShowField(e.target.checked)}
                                />
                                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                             </label>
                        </div>
                        {showField && (
                            <Slider 
                                label="Line Density" 
                                min={20} max={80} step={5} 
                                value={100 - fieldDensity} // Invert user perception (High density = low spacing)
                                onChange={(v) => setFieldDensity(100 - v)} // Convert back to spacing
                            />
                        )}
                    </div>

                    {/* Force Arrow Control */}
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                             <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                                <MoveDiagonal className="w-4 h-4 text-yellow-400" />
                                <span>Force Arrows</span>
                             </div>
                             <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={showArrows}
                                    onChange={(e) => setShowArrows(e.target.checked)}
                                />
                                <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
                             </label>
                        </div>
                        {showArrows && (
                            <Slider 
                                label="Arrow Scale" 
                                min={0.5} max={3.0} step={0.1} 
                                value={forceScale} 
                                onChange={(v) => setForceScale(v)}
                            />
                        )}
                    </div>
                 </div>
            </div>
        </div>

        {/* Object Panels Container */}
        <div className="flex flex-col gap-4 pb-4">
            {/* Object 1 Panel */}
            {obj1 && (
                <div className={clsx("bg-slate-800 p-4 rounded-xl border-l-4 shadow-lg transition-colors duration-300 shrink-0", style1.border)}>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className={clsx("font-bold text-xs uppercase tracking-wider transition-colors duration-300", style1.text)}>
                            Object 1
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                            <Activity className="w-3 h-3" />
                            v: {obj1.velocity.magnitude().toFixed(1)}
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <Slider 
                            label="Charge (q₁)" 
                            min={-10} max={10} step={1} 
                            value={Math.round(obj1.charge)} 
                            onChange={(v) => obj1.charge = v} 
                            unit="C"
                        />
                        <Slider 
                            label="Mass (m₁)" 
                            min={0.1} max={5} step={0.1} 
                            value={parseFloat(obj1.mass.toFixed(1))} 
                            onChange={(v) => obj1.mass = v}
                            unit="kg" 
                        />
                    </div>
                    <Button 
                        variant="secondary" 
                        className="w-full text-xs mt-3 py-1.5" 
                        onClick={() => handleGround(0)}
                        disabled={obj1.charge === 0}
                    >
                        Ground (Neutralize)
                    </Button>
                </div>
            )}

            {/* Object 2 Panel */}
            {obj2 && (
                <div className={clsx("bg-slate-800 p-4 rounded-xl border-l-4 shadow-lg transition-colors duration-300 shrink-0", style2.border)}>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className={clsx("font-bold text-xs uppercase tracking-wider transition-colors duration-300", style2.text)}>
                            Object 2
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                            <Activity className="w-3 h-3" />
                            v: {obj2.velocity.magnitude().toFixed(1)}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Slider 
                            label="Charge (q₂)" 
                            min={-10} max={10} step={1} 
                            value={Math.round(obj2.charge)} 
                            onChange={(v) => obj2.charge = v}
                            unit="C"
                        />
                        <Slider 
                            label="Mass (m₂)" 
                            min={0.1} max={5} step={0.1} 
                            value={parseFloat(obj2.mass.toFixed(1))} 
                            onChange={(v) => obj2.mass = v}
                            unit="kg" 
                        />
                    </div>
                    <Button 
                        variant="secondary" 
                        className="w-full text-xs mt-3 py-1.5" 
                        onClick={() => handleGround(1)}
                        disabled={obj2.charge === 0}
                    >
                        Ground (Neutralize)
                    </Button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default App;