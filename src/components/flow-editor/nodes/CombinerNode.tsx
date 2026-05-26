"use client";

import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import { GitMerge } from "lucide-react";

interface CombinerData {
  combinerType: "AND" | "OR";
  inputCount?: number;
}

export function CombinerNode({ id, data, selected }: NodeProps) {
  const { combinerType = "AND", inputCount = 2 } = (data as unknown as CombinerData) ?? {};
  const { setNodes } = useReactFlow();

  const isAnd = combinerType === "AND";
  const inputHandles = Array.from({ length: inputCount }, (_, i) => `in-${i}`);

  const accentClass = isAnd
    ? "border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/40"
    : "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40";

  const badgeClass = isAnd
    ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
    : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";

  const description = isAnd
    ? "Todas las entradas deben"
    : "Al menos una entrada debe";

  // Calculate spacing for multiple input handles
  const totalHeight = Math.max(70, inputCount * 22 + 40);

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                inputCount: Math.min(10, ((n.data.inputCount as number) ?? 2) + 1),
              },
            }
          : n
      )
    );
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                inputCount: Math.max(2, ((n.data.inputCount as number) ?? 2) - 1),
              },
            }
          : n
      )
    );
  };

  return (
    <div
      style={{ minHeight: totalHeight }}
      className={`relative flex flex-col items-center justify-center w-36 rounded-xl border-2 shadow-md transition-all select-none py-3 px-2 ${accentClass} ${
        selected ? "shadow-violet-200 dark:shadow-violet-900" : ""
      }`}
    >
      {/* Input handles — left side, evenly spaced */}
      {inputHandles.map((handleId, i) => (
        <Handle
          key={handleId}
          type="target"
          position={Position.Left}
          id={handleId}
          style={{ top: `${((i + 1) / (inputCount + 1)) * 100}%` }}
          className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-white dark:!border-zinc-800"
        />
      ))}

      {/* Icon */}
      <GitMerge
        className={`h-4 w-4 mb-1 ${isAnd ? "text-violet-500" : "text-blue-500"}`}
      />

      {/* Type badge */}
      <span className={`text-[11px] font-black px-2 py-0.5 rounded-md mb-1 ${badgeClass}`}>
        {combinerType}
      </span>

      {/* Description */}
      <p
        className={`text-[9px] font-medium text-center leading-tight px-1 ${
          isAnd ? "text-violet-600 dark:text-violet-400" : "text-blue-600 dark:text-blue-400"
        }`}
      >
        {description}
      </p>

      {/* Controls: Increase / Decrease Input Count */}
      <div className="flex items-center gap-1 mt-2 nodrag">
        <button
          type="button"
          onClick={handleDecrement}
          title="Reducir entradas"
          className="w-5 h-5 flex items-center justify-center rounded border border-zinc-200 bg-white hover:bg-zinc-50 text-[10px] font-bold text-zinc-600 cursor-pointer dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          -
        </button>
        <span className="text-[10px] font-semibold text-zinc-500 w-3 text-center">
          {inputCount}
        </span>
        <button
          type="button"
          onClick={handleIncrement}
          title="Aumentar entradas"
          className="w-5 h-5 flex items-center justify-center rounded border border-zinc-200 bg-white hover:bg-zinc-50 text-[10px] font-bold text-zinc-600 cursor-pointer dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          +
        </button>
      </div>

      {/* Single output handle — right */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-white dark:!border-zinc-800"
      />
    </div>
  );
}

