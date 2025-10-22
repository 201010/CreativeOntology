import React, { useCallback, useEffect, useState, useRef } from 'react';

interface EraFilterProps {
  eras: string[];
  selectedRange: [number, number];
  onRangeChange: (range: [number, number]) => void;
}

const EraFilter: React.FC<EraFilterProps> = ({ eras, selectedRange, onRangeChange }) => {
  const [minVal, setMinVal] = useState(selectedRange[0]);
  const [maxVal, setMaxVal] = useState(selectedRange[1]);
  const minValRef = useRef(selectedRange[0]);
  const maxValRef = useRef(selectedRange[1]);
  const range = useRef<HTMLDivElement>(null);

  const getPercent = useCallback((value: number) =>
    Math.round(((value) / (eras.length - 1)) * 100),
    [eras.length]
  );
  
  useEffect(() => {
    setMinVal(selectedRange[0]);
    setMaxVal(selectedRange[1]);
  }, [selectedRange]);

  useEffect(() => {
    const minPercent = getPercent(minVal);
    const maxPercent = getPercent(maxValRef.current);

    if (range.current) {
      range.current.style.left = `${minPercent}%`;
      range.current.style.width = `${maxPercent - minPercent}%`;
    }
  }, [minVal, getPercent]);

  useEffect(() => {
    const minPercent = getPercent(minValRef.current);
    const maxPercent = getPercent(maxVal);

    if (range.current) {
      range.current.style.width = `${maxPercent - minPercent}%`;
    }
  }, [maxVal, getPercent]);

  const handleMinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(event.target.value), maxVal);
    setMinVal(value);
    minValRef.current = value;
    onRangeChange([value, maxVal]);
  };

  const handleMaxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(event.target.value), minVal);
    setMaxVal(value);
    maxValRef.current = value;
    onRangeChange([minVal, value]);
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/70 p-4 rounded-lg z-10 border border-gray-700 w-11/12 max-w-4xl">
      <h3 className="text-sm font-semibold mb-3 text-center tracking-wider text-gray-300">
        Filter by Era Range: <span className="font-bold text-white">{eras[minVal]} &mdash; {eras[maxVal]}</span>
      </h3>
      <div className="relative flex items-center h-8">
        <input
          type="range"
          min="0"
          max={eras.length - 1}
          value={minVal}
          onChange={handleMinChange}
          className="thumb thumb--left"
        />
        <input
          type="range"
          min="0"
          max={eras.length - 1}
          value={maxVal}
          onChange={handleMaxChange}
          className="thumb thumb--right"
        />
        <div className="relative w-full">
          <div className="absolute w-full rounded h-1 bg-gray-700 z-0 top-1/2 -translate-y-1/2"></div>
          <div ref={range} className="absolute rounded h-1 bg-blue-500 z-1 top-1/2 -translate-y-1/2"></div>
        </div>
      </div>
       <style>{`
          .thumb {
            pointer-events: none;
            position: absolute;
            height: 0;
            width: 100%;
            outline: none;
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            background: transparent;
            z-index: 5;
          }
          .thumb::-webkit-slider-thumb {
            pointer-events: all;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid white;
            background: #3b82f6; /* blue-500 */
            cursor: pointer;
            -webkit-appearance: none;
            margin-top: -8px;
          }
          .thumb:focus::-webkit-slider-thumb {
            box-shadow: 0 0 0 1px white;
          }
           .thumb::-moz-range-thumb {
            pointer-events: all;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid white;
            background: #3b82f6;
            cursor: pointer;
            -moz-appearance: none;
          }
          .thumb:focus::-moz-range-thumb {
            box-shadow: 0 0 0 1px white;
          }
        `}</style>
    </div>
  );
};

export default EraFilter;
