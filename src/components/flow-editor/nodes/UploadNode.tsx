"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { Upload } from "lucide-react";

export function UploadNode({ selected }: NodeProps) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center w-36 h-20 rounded-xl border-2 shadow-md bg-indigo-50 dark:bg-indigo-950/40 transition-all select-none ${
        selected
          ? "border-indigo-500 shadow-indigo-200 dark:shadow-indigo-900"
          : "border-indigo-300 dark:border-indigo-700"
      }`}
    >
      <Upload className="h-5 w-5 text-indigo-500 dark:text-indigo-400 mb-1" />
      <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 text-center leading-tight px-2">
        Carga de Documento
      </span>
      {/* Single output handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-white dark:!border-zinc-800"
      />
    </div>
  );
}
