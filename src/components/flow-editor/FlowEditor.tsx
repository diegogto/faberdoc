"use client";

import { useCallback, useRef, useState, useTransition, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  BackgroundVariant,
  MarkerType,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { UploadNode } from "./nodes/UploadNode";
import { ApprovedNode } from "./nodes/ApprovedNode";
import { ReviewerNode } from "./nodes/ReviewerNode";
import { CombinerNode } from "./nodes/CombinerNode";
import { ExecutorNode } from "./nodes/ExecutorNode";
import { saveReviewFlowAction } from "@/app/(dashboard)/projects/actions";
import { Button } from "@/components/ui/button";
import { Save, GitMerge, Loader2, Wrench } from "lucide-react";

// ─── Constants ──────────────────────────────────────────────────────────────

const NODE_TYPES: NodeTypes = {
  upload: UploadNode,
  approved: ApprovedNode,
  reviewer: ReviewerNode,
  and: CombinerNode,
  or: CombinerNode,
  executor: ExecutorNode,
};

const FIXED_UPLOAD_ID = "upload";
const FIXED_APPROVED_ID = "approved";

// Maps sourceHandle id → edge color
const HANDLE_COLORS: Record<string, string> = {
  // Reviewer handles
  approved:  "#22c55e",
  minor:     "#f59e0b",
  major:     "#ef4444",
  // Executor handles
  resolved:  "#22c55e",
  rereview:  "#ef4444",
  // Generic/combiner
  out:       "#94a3b8",
};

function edgeColorFromHandle(sourceHandle: string | null | undefined): string {
  if (!sourceHandle) return "#94a3b8";
  return HANDLE_COLORS[sourceHandle] ?? "#94a3b8";
}

function edgeTypeFromHandle(sourceHandle: string | null | undefined): string {
  if (!sourceHandle) return "flow";
  if (sourceHandle === "approved" || sourceHandle === "resolved" || sourceHandle === "out") return "APPROVED";
  if (sourceHandle === "minor")    return "MINOR";
  if (sourceHandle === "major" || sourceHandle === "rereview") return "MAJOR";
  return "flow";
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReviewerOption {
  userId: string;
  userName: string;
  userEmail?: string | null;
}

export interface FlowConfig {
  nodes: Pick<Node, "id" | "type" | "position" | "data">[];
  edges: Pick<Edge, "id" | "source" | "target" | "sourceHandle" | "targetHandle" | "data">[];
}

export interface FlowEditorProps {
  projectId: string;
  reviewers: ReviewerOption[];
  initialConfig?: FlowConfig | null;
  /** Called when flow is saved successfully */
  onSaved?: () => void;
  /** If true, shows the save button. Pass false when save is controlled externally. */
  showSaveButton?: boolean;
  /** External save trigger — receives current flowConfig */
  onFlowChange?: (config: FlowConfig) => void;
  /** Flow id for multi-flow persistence */
  flowId?: string;
  /** Increment this value to trigger a save action from parent */
  saveTrigger?: number;
}

// ─── Initial fixed nodes ────────────────────────────────────────────────────

function buildInitialNodes(savedNodes?: FlowConfig["nodes"]): Node[] {
  if (savedNodes && savedNodes.length > 0) {
    return savedNodes.map((n) => ({
      ...n,
      data: n.data ?? {},
      draggable: true,
      deletable: n.id !== FIXED_UPLOAD_ID && n.id !== FIXED_APPROVED_ID,
    }));
  }
  return [
    { id: FIXED_UPLOAD_ID,   type: "upload",   position: { x: 60,  y: 180 }, data: {}, draggable: true, deletable: false },
    { id: FIXED_APPROVED_ID, type: "approved", position: { x: 860, y: 180 }, data: {}, draggable: true, deletable: false },
  ];
}

function buildInitialEdges(savedEdges?: FlowConfig["edges"]): Edge[] {
  if (!savedEdges) return [];
  return savedEdges.map((e) => {
    const color = edgeColorFromHandle(e.sourceHandle);
    const edgeType = (e.data as any)?.edgeType || edgeTypeFromHandle(e.sourceHandle);
    return {
      ...e,
      type: "smoothstep",
      pathOptions: { borderRadius: 15 },
      data: { ...(e.data ?? {}), edgeType },
      style: { stroke: color, strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color },
      animated: edgeType === "APPROVED",
    };
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FlowEditor({
  projectId,
  reviewers,
  initialConfig,
  onSaved,
  showSaveButton = true,
  onFlowChange,
  flowId,
  saveTrigger = 0,
}: FlowEditorProps) {
  const [nodes, setNodes, onNodesChangeState] = useNodesState(buildInitialNodes(initialConfig?.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildInitialEdges(initialConfig?.edges));

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeState(changes);
      
      // Enforce constraint: upload node is always to the left of approved node
      setNodes((currentNodes) => {
        const upload = currentNodes.find((n) => n.id === FIXED_UPLOAD_ID);
        const approved = currentNodes.find((n) => n.id === FIXED_APPROVED_ID);
        if (upload && approved && upload.position.x >= approved.position.x) {
          return currentNodes.map((n) => {
            if (n.id === FIXED_APPROVED_ID) {
              return { ...n, position: { ...n.position, x: upload.position.x + 160 } };
            }
            return n;
          });
        }
        return currentNodes;
      });
    },
    [onNodesChangeState, setNodes]
  );

  // Trigger handleSave when saveTrigger is incremented by the parent component
  useEffect(() => {
    if (saveTrigger > 0) {
      handleSave();
    }
  }, [saveTrigger]);

  const [isPending, startTransition] = useTransition();
  const [saveMsg, setSaveMsg]     = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const idCounter = useRef(Date.now());

  const genId = (prefix: string) => `${prefix}-${++idCounter.current}`;

  // ── Connect ────────────────────────────────────────────────────────────────
  const onConnect = useCallback(
    (connection: Connection) => {
      const color = edgeColorFromHandle(connection.sourceHandle);
      const edgeType = edgeTypeFromHandle(connection.sourceHandle);
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: genId("edge"),
            type: "smoothstep",
            pathOptions: { borderRadius: 15 },
            data: { edgeType },
            style: { stroke: color, strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color },
            animated: edgeType === "APPROVED",
          } as any,
          eds
        )
      );
    },
    [setEdges]
  );

  // ── Drag from panel ────────────────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, payload: object) => {
    e.dataTransfer.setData("application/faberdoc-node", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("application/faberdoc-node");
      if (!raw) return;

      const payload = JSON.parse(raw) as {
        type: string;
        reviewer?: ReviewerOption;
        combinerType?: "AND" | "OR";
      };

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const position = {
        x: e.clientX - bounds.left - 88,
        y: e.clientY - bounds.top  - 55,
      };

      let newNode: Node;

      if (payload.type === "reviewer" && payload.reviewer) {
        newNode = {
          id: genId("rev"),
          type: "reviewer",
          position,
          data: {
            userId:    payload.reviewer.userId,
            userName:  payload.reviewer.userName,
            userEmail: payload.reviewer.userEmail,
          },
        };
      } else if (payload.type === "executor") {
        newNode = { id: genId("exec"), type: "executor", position, data: {} };
      } else if (payload.type === "and" || payload.type === "or") {
        newNode = {
          id: genId(payload.type),
          type: payload.type,
          position,
          data: { combinerType: payload.type.toUpperCase(), inputCount: 2 },
        };
      } else {
        return;
      }

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const buildFlowConfig = (): FlowConfig => ({
    nodes: nodes.map(({ id, type, position, data }) => ({ id, type, position, data })),
    edges: edges.map(({ id, source, target, sourceHandle, targetHandle, data }) => ({
      id, source, target, sourceHandle, targetHandle, data,
    })),
  });

  const handleSave = () => {
    setSaveMsg(null);
    setSaveError(null);

    const hasApprovedPath = edges.some(
      (e) => e.target === FIXED_APPROVED_ID && (e.data as any)?.edgeType === "APPROVED"
    );
    if (!hasApprovedPath) {
      setSaveError('El flujo debe tener al menos una conexión "Aprobado" llegando al nodo "Documento Aprobado".');
      return;
    }

    if (onFlowChange) {
      const flowConfig = buildFlowConfig();
      onFlowChange(flowConfig);
      setSaveMsg("Flujo actualizado en memoria.");
      onSaved?.();
      setTimeout(() => setSaveMsg(null), 2000);
      return;
    }

    startTransition(async () => {
      const flowConfig = buildFlowConfig();
      const res = await saveReviewFlowAction(projectId, flowConfig);
      if (res?.error) {
        setSaveError(res.error);
      } else {
        setSaveMsg("Flujo guardado exitosamente.");
        onSaved?.();
        setTimeout(() => setSaveMsg(null), 3000);
      }
    });
  };

  // ── Panel items ────────────────────────────────────────────────────────────
  const panelItems = [
    // Executor (generic, always available)
    {
      key: "executor",
      label: "Ejecutor del Plano",
      subtitle: "Genérico",
      icon: <Wrench className="h-3.5 w-3.5 text-zinc-500" />,
      dragPayload: { type: "executor" },
    },
    // Reviewers
    ...reviewers.map((r) => ({
      key: r.userId,
      label: r.userName,
      subtitle: r.userEmail ?? undefined,
      icon: (
        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300 uppercase">
          {r.userName?.charAt(0)}
        </span>
      ),
      dragPayload: { type: "reviewer", reviewer: r },
    })),
  ];

  return (
    <div className="flex flex-col gap-3 h-full">
      {saveError && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 font-medium">
          {saveError}
        </div>
      )}
      {saveMsg && (
        <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 dark:text-green-400 rounded-md border border-green-200 dark:border-green-900/30 font-medium">
          {saveMsg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* AND / OR as draggable chips */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, { type: "and" })}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 text-xs font-semibold cursor-grab active:cursor-grabbing select-none hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
        >
          <GitMerge className="h-3.5 w-3.5" /> AND
        </div>
        <div
          draggable
          onDragStart={(e) => onDragStart(e, { type: "or" })}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-semibold cursor-grab active:cursor-grabbing select-none hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <GitMerge className="h-3.5 w-3.5" /> OR
        </div>

        <div className="flex-1" />

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-[10px] text-zinc-500 font-medium">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-green-400 rounded" />Aprobado / Resuelto</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-amber-400 rounded" />Com. Menores</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-red-400 rounded" />Com. Mayores / Re-revisar</span>
        </div>

        {showSaveButton && (
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isPending}
            className="gap-1.5 text-xs h-8 cursor-pointer"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Guardar Flujo
          </Button>
        )}
      </div>

      {/* Main editor area */}
      <div className="flex gap-3" style={{ height: 480 }}>
        {/* Left panel */}
        <div className="w-44 shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-1">
            Arrastrar al diagrama
          </p>
          {panelItems.map((item) => (
            <div
              key={item.key}
              draggable
              onDragStart={(e) => onDragStart(e, item.dragPayload)}
              className="flex items-center gap-2 px-2 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 cursor-grab active:cursor-grabbing hover:border-zinc-400 dark:hover:border-zinc-500 hover:shadow-sm transition-all select-none"
            >
              <div className="h-6 w-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate leading-tight">
                  {item.label}
                </p>
                {item.subtitle && (
                  <p className="text-[9px] text-zinc-400 truncate">{item.subtitle}</p>
                )}
              </div>
            </div>
          ))}

          <div className="mt-2 px-1 border-t border-zinc-100 dark:border-zinc-800 pt-3">
            <ul className="space-y-1.5 text-[10px] text-zinc-400 leading-relaxed">
              <li>• Arrastra ítems al lienzo</li>
              <li>• Tira de los handles (círculos) para conectar</li>
              <li>• <kbd className="px-1 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[9px]">Del</kbd> elimina selección</li>
            </ul>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={reactFlowWrapper}
          className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/20"
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            deleteKeyCode="Delete"
            defaultEdgeOptions={{
              type: "smoothstep",
              pathOptions: { borderRadius: 15 },
              style: { strokeWidth: 2, stroke: "#94a3b8" },
              markerEnd: { type: MarkerType.ArrowClosed },
            } as any}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
            <Controls className="!bg-white dark:!bg-zinc-900 !border-zinc-200 dark:!border-zinc-700 !shadow-sm" showInteractive={false} />
            <MiniMap
              style={{ width: 120, height: 80 }}
              className="!bg-white dark:!bg-zinc-900 !border-zinc-200 dark:!border-zinc-700"
              nodeColor={(n) => {
                if (n.type === "upload")   return "#818cf8";
                if (n.type === "approved") return "#4ade80";
                if (n.type === "executor") return "#a1a1aa";
                if (n.type === "and")      return "#a78bfa";
                if (n.type === "or")       return "#60a5fa";
                return "#94a3b8";
              }}
              maskColor="rgba(240,245,255,0.6)"
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
