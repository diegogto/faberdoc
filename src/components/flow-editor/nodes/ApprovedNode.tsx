"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { CheckCircle2 } from "lucide-react";

export function ApprovedNode({ selected }: NodeProps) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center w-36 h-20 rounded-xl border-2 shadow-md bg-green-50 dark:bg-green-950/40 transition-all select-none ${
        selected
          ? "border-green-500 shadow-green-200 dark:shadow-green-900"
          : "border-green-300 dark:border-green-700"
      }`}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="!w-3 !h-3 !bg-green-400 !border-2 !border-white dark:!border-zinc-800"
      />
      <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400 mb-1" />
      <span className="text-xs font-semibold text-green-700 dark:text-green-300 text-center leading-tight px-2">
        Documento Aprobado
      </span>
    </div>
  );
}
