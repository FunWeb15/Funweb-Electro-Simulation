import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  unit?: string;
  disabled?: boolean;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = '',
  disabled = false,
}) => {
  return (
    <div className={`flex flex-col mb-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex justify-between mb-1 text-sm font-medium text-slate-300">
        <label>{label}</label>
        <span className="font-mono text-slate-400">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
        disabled={disabled}
      />
    </div>
  );
};
