"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";
import { User } from "lucide-react";

interface ReviewerData {
  userId: string;
  userName: string;
  userEmail?: string;
}

export function ReviewerNode({ data, selected }: NodeProps) {
  const { userName, userEmail } = (data as unknown as ReviewerData) ?? {};
  const initial = userName?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div
      className={`relative flex flex-col w-44 rounded-xl border-2 shadow-md bg-white dark:bg-zinc-900 overflow-hidden transition-all select-none ${
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
          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{initial}</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
            {userName ?? "Revisor"}
          </p>
          {userEmail && (
            <p className="text-[10px] text-zinc-400 truncate">{userEmail}</p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-zinc-100 dark:border-zinc-800" />

      {/* Output handles with labels */}
      <div className="flex flex-col gap-0 py-1 pr-3 pl-2 relative">
        {/* APPROVED */}
        <div className="relative flex items-center justify-end h-7 pr-2">
          <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 mr-2">
            Aprobado
          </span>
          <Handle
            type="source"
            position={Position.Right}
            id="approved"
            style={{ top: "50%", right: -12 }}
            className="!w-3 !h-3 !bg-green-400 !border-2 !border-white dark:!border-zinc-800 !relative !transform-none !inset-auto"
          />
        </div>

        {/* MINOR */}
        <div className="relative flex items-center justify-end h-7 pr-2">
          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mr-2">
            Com. Menores
          </span>
          <Handle
            type="source"
            position={Position.Right}
            id="minor"
            style={{ top: "50%", right: -12 }}
            className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white dark:!border-zinc-800 !relative !transform-none !inset-auto"
          />
        </div>

        {/* MAJOR */}
        <div className="relative flex items-center justify-end h-7 pr-2">
          <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 mr-2">
            Com. Mayores
          </span>
          <Handle
            type="source"
            position={Position.Right}
            id="major"
            style={{ top: "50%", right: -12 }}
            className="!w-3 !h-3 !bg-red-400 !border-2 !border-white dark:!border-zinc-800 !relative !transform-none !inset-auto"
          />
        </div>
      </div>
    </div>
  );
}
