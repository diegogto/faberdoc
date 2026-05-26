"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { Wrench } from "lucide-react";

export function ExecutorNode({ selected }: NodeProps) {
  return (
    <div
      className={`relative flex flex-col w-40 rounded-xl border-2 shadow-md bg-white dark:bg-zinc-900 overflow-hidden transition-all select-none ${
        selected
          ? "border-zinc-400 dark:border-zinc-500 shadow-zinc-200 dark:shadow-zinc-800"
          : "border-zinc-200 dark:border-zinc-700"
      }`}
    >
      {/* Single target handle — left */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-white dark:!border-zinc-800"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
          <Wrench className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
            Ejecutor
          </p>
          <p className="text-[10px] text-zinc-400 leading-tight">Genérico</p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-zinc-100 dark:border-zinc-800" />

      {/* Output handles */}
      <div className="flex flex-col gap-0 py-1 pr-3 pl-2 relative">
        {/* RESOLVED */}
        <div className="relative flex items-center justify-end h-7 pr-2">
          <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 mr-2">
            Resuelto
          </span>
          <Handle
            type="source"
            position={Position.Right}
            id="resolved"
            style={{ top: "50%", right: -12 }}
            className="!w-3 !h-3 !bg-green-400 !border-2 !border-white dark:!border-zinc-800 !relative !transform-none !inset-auto"
          />
        </div>

        {/* RE-REVIEW */}
        <div className="relative flex items-center justify-end h-7 pr-2">
          <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 mr-2">
            Re-revisar
          </span>
          <Handle
            type="source"
            position={Position.Right}
            id="rereview"
            style={{ top: "50%", right: -12 }}
            className="!w-3 !h-3 !bg-red-400 !border-2 !border-white dark:!border-zinc-800 !relative !transform-none !inset-auto"
          />
        </div>
      </div>
    </div>
  );
}
