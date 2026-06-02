import type { ReviewFlow } from "@/components/flow-editor/FlowConfigManager";

/**
 * Mapea las propiedades personalizadas (metadata) de un documento para ver si coincide
 * con las condiciones de algún flujo. Retorna el primer flujo coincidente o el default.
 */
export function matchFlowForDocument(flows: ReviewFlow[], docProperties: Record<string, any>): ReviewFlow {
  if (!flows || flows.length === 0) {
    return {
      id: "default-flow",
      name: "Flujo de Aprobación Estándar",
      isDefault: true,
      conditions: [],
    };
  }

  // Buscar primer flujo no default que cumpla todas las condiciones
  for (const flow of flows) {
    if (flow.isDefault) continue;
    if (!flow.conditions || flow.conditions.length === 0) continue;

    const matchesAll = flow.conditions.every((cond) => {
      const docVal = docProperties[cond.field];
      if (docVal === undefined || docVal === null) return false;

      const docValStr = String(docVal).toLowerCase().trim();
      const condValStr = String(cond.value).toLowerCase().trim();

      if (cond.operator === "equals") {
        return docValStr === condValStr;
      } else if (cond.operator === "contains") {
        return docValStr.includes(condValStr);
      }
      return false;
    });

    if (matchesAll) {
      return flow;
    }
  }

  // Fallback al default o al primero
  const defaultFlow = flows.find((f) => f.isDefault) || flows[0];
  return defaultFlow;
}

/**
 * Atraviesa de forma recursiva los bloques del diagrama de flujo (combinadores AND/OR)
 * para encontrar todos los nodos destinatarios finales (reviewer, executor, approved).
 */
export function resolveTargetNodes(flow: ReviewFlow, startNodeId: string, visited = new Set<string>()): any[] {
  if (visited.has(startNodeId)) return [];
  visited.add(startNodeId);

  const node = flow.nodes?.find((n) => n.id === startNodeId);
  if (!node) return [];

  // Nodos finales/destinatarios reales
  if (node.type === "reviewer" || node.type === "executor" || node.type === "approved") {
    return [node];
  }

  // Nodos lógicos (AND / OR)
  if (node.type === "and" || node.type === "or") {
    const outgoingEdges = flow.edges?.filter((e) => e.source === startNodeId) || [];
    let targets: any[] = [];
    for (const edge of outgoingEdges) {
      targets = [...targets, ...resolveTargetNodes(flow, edge.target, visited)];
    }
    return targets;
  }

  return [];
}

/**
 * Determina el estado inicial de workflow para una revisión recién enviada a revisión.
 */
export function initiateWorkflow(
  flows: ReviewFlow[],
  docProperties: Record<string, any>
): { currentFlowId: string; activeNodes: any[] } {
  const matchedFlow = matchFlowForDocument(flows, docProperties);

  // El nodo de inicio es siempre el de upload ("upload")
  const startEdges = matchedFlow.edges?.filter((e) => e.source === "upload") || [];
  let resolvedTargets: any[] = [];
  const visited = new Set<string>();

  for (const edge of startEdges) {
    resolvedTargets = [...resolvedTargets, ...resolveTargetNodes(matchedFlow, edge.target, visited)];
  }

  // Filtrar duplicados por ID de nodo
  const uniqueTargetsMap = new Map<string, any>();
  for (const node of resolvedTargets) {
    uniqueTargetsMap.set(node.id, node);
  }

  const activeNodes = Array.from(uniqueTargetsMap.values()).map((node) => ({
    nodeId: node.id,
    type: node.type,
    data: node.data || {},
    status: "PENDING",
  }));

  return {
    currentFlowId: matchedFlow.id,
    activeNodes,
  };
}

/**
 * Transiciona el estado del workflow ante una acción de un usuario en un nodo activo.
 */
export function transitionWorkflow(
  flows: ReviewFlow[],
  currentFlowId: string,
  activeNodes: any[],
  action: "approved" | "minor" | "major" | "resolved" | "rereview",
  actorUserId: string
): { status: "IN_REVIEW" | "COMMENTED" | "APPROVED"; commentLevel?: "MINOR" | "MAJOR" | null; nextActiveNodes: any[] } {
  const activeFlow = flows.find((f) => f.id === currentFlowId);
  if (!activeFlow) {
    // Si no hay flujo, fallback al comportamiento por defecto (sin diagrama)
    if (action === "approved" || action === "resolved") {
      return { status: "APPROVED", nextActiveNodes: [] };
    }
    return {
      status: "COMMENTED",
      commentLevel: action === "minor" ? "MINOR" : "MAJOR",
      nextActiveNodes: [],
    };
  }

  // 1. Encontrar cuál de los nodos activos pendientes responde esta acción
  let targetActiveNodeIdx = -1;

  if (action === "resolved" || action === "rereview") {
    // Para el ejecutor, buscamos un nodo activo de tipo "executor"
    targetActiveNodeIdx = activeNodes.findIndex((n) => n.type === "executor" && n.status === "PENDING");
  } else {
    // Para revisores, buscamos el nodo de tipo "reviewer" asociado al actor
    targetActiveNodeIdx = activeNodes.findIndex(
      (n) => n.type === "reviewer" && n.status === "PENDING" && n.data?.userId === actorUserId
    );

    // Si no coincide exactamente (por ejemplo, un ADMIN aprobando en nombre del revisor), tomamos el primer reviewer pendiente
    if (targetActiveNodeIdx === -1) {
      targetActiveNodeIdx = activeNodes.findIndex((n) => n.type === "reviewer" && n.status === "PENDING");
    }
  }

  if (targetActiveNodeIdx === -1) {
    // No hay nodo activo correspondiente pendiente, no se altera el estado
    return { status: "IN_REVIEW", nextActiveNodes: activeNodes };
  }

  const respondingNode = activeNodes[targetActiveNodeIdx];

  // 2. Procesar acción: Comentarios (Menores o Mayores)
  // Devuelven el flujo de inmediato al ejecutor conectado
  if (action === "minor" || action === "major") {
    const outgoingEdge = activeFlow.edges?.find(
      (e) => e.source === respondingNode.nodeId && e.sourceHandle === action
    );

    let nextActiveNodes: any[] = [];
    if (outgoingEdge) {
      const resolved = resolveTargetNodes(activeFlow, outgoingEdge.target);
      nextActiveNodes = resolved.map((node) => ({
        nodeId: node.id,
        type: node.type,
        data: node.data || {},
        status: "PENDING",
      }));
    }

    // Como un revisor comentó, cancelamos las demás revisiones paralelas pendientes de este bloque
    return {
      status: "COMMENTED",
      commentLevel: action === "minor" ? "MINOR" : "MAJOR",
      nextActiveNodes,
    };
  }

  // 3. Procesar acción: Aprobación de Revisor
  if (action === "approved") {
    // Actualizar estado del nodo específico de la revisión
    const updatedActiveNodes = activeNodes.map((n, idx) =>
      idx === targetActiveNodeIdx ? { ...n, status: "APPROVED" } : n
    );

    // Verificar si quedan otros revisores pendientes en paralelo
    const hasPendingReviewers = updatedActiveNodes.some(
      (n) => n.type === "reviewer" && n.status === "PENDING"
    );

    if (hasPendingReviewers) {
      // Quedan pendientes, mantenemos el estado en revisión con la lista actualizada
      return {
        status: "IN_REVIEW",
        nextActiveNodes: updatedActiveNodes,
      };
    }

    // Todos los revisores de este nivel han aprobado! Avanzamos al siguiente nodo.
    // Buscamos las salidas conectadas al handle "approved" de los nodos aprobados.
    const approvedNodeIds = updatedActiveNodes
      .filter((n) => n.type === "reviewer" && n.status === "APPROVED")
      .map((n) => n.nodeId);

    let nextTargets: any[] = [];
    const visited = new Set<string>();

    for (const nodeId of approvedNodeIds) {
      const approvedEdge = activeFlow.edges?.find(
        (e) => e.source === nodeId && e.sourceHandle === "approved"
      );
      if (approvedEdge) {
        nextTargets = [...nextTargets, ...resolveTargetNodes(activeFlow, approvedEdge.target, visited)];
      }
    }

    // Filtrar duplicados
    const uniqueTargetsMap = new Map<string, any>();
    for (const node of nextTargets) {
      uniqueTargetsMap.set(node.id, node);
    }
    const resolvedNodes = Array.from(uniqueTargetsMap.values());

    // Si llegamos al nodo final de aprobado
    const hasFinalApproval = resolvedNodes.some((n) => n.id === "approved");

    if (hasFinalApproval || resolvedNodes.length === 0) {
      return {
        status: "APPROVED",
        nextActiveNodes: [],
      };
    }

    // De lo contrario, los siguientes nodos quedan activos
    const nextActiveNodes = resolvedNodes.map((node) => ({
      nodeId: node.id,
      type: node.type,
      data: node.data || {},
      status: "PENDING",
    }));

    return {
      status: "IN_REVIEW",
      nextActiveNodes,
    };
  }

  // 4. Procesar acción: Ejecutor (Resuelto o Re-revisar)
  if (action === "resolved" || action === "rereview") {
    const outgoingEdge = activeFlow.edges?.find(
      (e) => e.source === respondingNode.nodeId && e.sourceHandle === action
    );

    let resolvedNodes: any[] = [];
    if (outgoingEdge) {
      resolvedNodes = resolveTargetNodes(activeFlow, outgoingEdge.target);
    }

    const hasFinalApproval = resolvedNodes.some((n) => n.id === "approved");
    if (hasFinalApproval || resolvedNodes.length === 0) {
      return {
        status: "APPROVED",
        nextActiveNodes: [],
      };
    }

    const nextActiveNodes = resolvedNodes.map((node) => ({
      nodeId: node.id,
      type: node.type,
      data: node.data || {},
      status: "PENDING",
    }));

    // Si volvimos a mandarlo a revisores, vuelve a IN_REVIEW
    // Si no, se considera aprobado o en el estado correspondiente
    const isBackToReviewer = nextActiveNodes.some((n) => n.type === "reviewer");

    return {
      status: isBackToReviewer ? "IN_REVIEW" : "APPROVED",
      nextActiveNodes,
    };
  }

  return { status: "IN_REVIEW", nextActiveNodes: activeNodes };
}
