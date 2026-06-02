/**
 * Mock data for Faberdoc frontend development.
 * Mirrors the database schema structure from masterplan.md.
 * Will be replaced by Supabase queries when backend is connected.
 */

import type {
  Organization,
  User,
  Project,
  ProjectWithRole,
  DocumentTableRow,
  TransmittalTableRow,
  DocumentDetail,
  Revision,
  FileRecord,
  Comment,
  IssuanceLog,
} from "./types";

// ─── Organizations ──────────────────────────────────────────────────────────

export const MOCK_CURRENT_USER_ORG_ID = "org-001";

export const mockOrganizations: Organization[] = [
  {
    id: "org-001",
    name: "Fuller S.A.",
    created_at: "2025-01-15T10:00:00Z",
    updated_at: "2025-01-15T10:00:00Z",
    deleted_at: null,
  },
  {
    id: "org-002",
    name: "Constructora Vázquez",
    created_at: "2025-02-01T10:00:00Z",
    updated_at: "2025-02-01T10:00:00Z",
    deleted_at: null,
  },
  {
    id: "org-003",
    name: "Minera del Norte SpA",
    created_at: "2025-03-10T10:00:00Z",
    updated_at: "2025-03-10T10:00:00Z",
    deleted_at: null,
  },
];

// ─── Users ──────────────────────────────────────────────────────────────────

export const MOCK_CURRENT_USER_ID = "user-001";

export const mockUsers: User[] = [
  {
    id: "user-001",
    organization_id: "org-001",
    full_name: "Diego García",
    avatar_url: null,
    created_at: "2025-01-15T10:00:00Z",
  },
  {
    id: "user-002",
    organization_id: "org-001",
    full_name: "María López",
    avatar_url: null,
    created_at: "2025-01-20T10:00:00Z",
  },
  {
    id: "user-003",
    organization_id: "org-002",
    full_name: "Carlos Vázquez",
    avatar_url: null,
    created_at: "2025-02-05T10:00:00Z",
  },
  {
    id: "user-004",
    organization_id: "org-003",
    full_name: "Ana Rodríguez",
    avatar_url: null,
    created_at: "2025-03-15T10:00:00Z",
  },
];

// ─── Projects ───────────────────────────────────────────────────────────────

export const mockProjects: Project[] = [
  {
    id: "proj-001",
    organization_id: "org-001",
    name: "Planta Desaladora Atacama",
    naming_pattern: "{PROY}-{ESP}-{AREA}-{NUM}",
    custom_properties_definition: [
      {
        key: "specialty",
        label: "Especialidad",
        type: "select",
        options: [
          "Civil",
          "Mecánica",
          "Eléctrica",
          "Instrumentación",
          "Piping",
          "Procesos",
        ],
      },
      {
        key: "area",
        label: "Área",
        type: "select",
        options: ["Área 100", "Área 200", "Área 300", "General"],
      },
      {
        key: "discipline_code",
        label: "Código Disciplina",
        type: "text",
      },
    ],
    client_info: { client_name: "Minera del Norte SpA", contract: "CN-2025-001" },
    created_at: "2025-04-01T10:00:00Z",
    deleted_at: null,
  },
  {
    id: "proj-002",
    organization_id: "org-001",
    name: "Expansión Terminal GNL",
    naming_pattern: "{PROY}-{ESP}-{NUM}",
    custom_properties_definition: [
      {
        key: "specialty",
        label: "Especialidad",
        type: "select",
        options: ["Civil", "Mecánica", "Eléctrica", "Piping"],
      },
      {
        key: "area",
        label: "Área",
        type: "select",
        options: ["Terminal", "Almacenamiento", "General"],
      },
    ],
    client_info: null,
    created_at: "2025-06-15T10:00:00Z",
    deleted_at: null,
  },
  {
    id: "proj-003",
    organization_id: "org-002",
    name: "Puente Río Mapocho",
    naming_pattern: "{PROY}-{ESP}-{NUM}",
    custom_properties_definition: [
      {
        key: "specialty",
        label: "Especialidad",
        type: "select",
        options: ["Estructural", "Geotecnia", "Hidráulica"],
      },
      {
        key: "area",
        label: "Área",
        type: "select",
        options: ["Estribo Norte", "Estribo Sur", "Tablero", "General"],
      },
    ],
    client_info: null,
    created_at: "2025-07-01T10:00:00Z",
    deleted_at: null,
  },
  {
    id: "proj-004",
    organization_id: "org-003",
    name: "Línea de Transmisión 220kV",
    naming_pattern: "{PROY}-{ESP}-{AREA}-{NUM}",
    custom_properties_definition: [
      {
        key: "specialty",
        label: "Especialidad",
        type: "select",
        options: ["Eléctrica", "Civil", "Topografía"],
      },
      {
        key: "area",
        label: "Área",
        type: "select",
        options: ["Tramo 1", "Tramo 2", "Subestación", "General"],
      },
    ],
    client_info: null,
    created_at: "2025-08-01T10:00:00Z",
    deleted_at: null,
  },
];

// ─── Projects with role (for sidebar) ───────────────────────────────────────

export const mockProjectsWithRole: ProjectWithRole[] = [
  {
    id: "proj-001",
    name: "Planta Desaladora Atacama",
    organization_id: "org-001",
    organization_name: "Fuller S.A.",
    role: "ADMIN",
    is_own_organization: true,
  },
  {
    id: "proj-002",
    name: "Expansión Terminal GNL",
    organization_id: "org-001",
    organization_name: "Fuller S.A.",
    role: "ADMIN",
    is_own_organization: true,
  },
  {
    id: "proj-003",
    name: "Puente Río Mapocho",
    organization_id: "org-002",
    organization_name: "Constructora Vázquez",
    role: "REVIEWER",
    is_own_organization: false,
  },
  {
    id: "proj-004",
    name: "Línea de Transmisión 220kV",
    organization_id: "org-003",
    organization_name: "Minera del Norte SpA",
    role: "VIEWER",
    is_own_organization: false,
  },
];

// ─── Documents (MDL rows) ───────────────────────────────────────────────────

export const mockDocumentRows: Record<string, DocumentTableRow[]> = {
  "proj-001": [
    {
      id: "doc-001",
      document_code: "PDA-CIV-A100-001",
      title: "Plano General de Disposición - Área 100",
      specialty: "Civil",
      area: "Área 100",
      latest_revision: "B",
      status: "APPROVED",
      planned_date: "2025-06-15",
      actual_date: "2025-06-14",
    },
    {
      id: "doc-002",
      document_code: "PDA-CIV-A100-002",
      title: "Especificación Técnica de Hormigones",
      specialty: "Civil",
      area: "Área 100",
      latest_revision: "A",
      status: "IN_REVIEW",
      planned_date: "2025-07-01",
      actual_date: null,
    },
    {
      id: "doc-003",
      document_code: "PDA-MEC-A200-001",
      title: "Diagrama de Tuberías e Instrumentación (P&ID)",
      specialty: "Mecánica",
      area: "Área 200",
      latest_revision: "C",
      status: "ISSUED",
      planned_date: "2025-05-20",
      actual_date: "2025-05-19",
    },
    {
      id: "doc-004",
      document_code: "PDA-ELE-A100-001",
      title: "Diagrama Unifilar General",
      specialty: "Eléctrica",
      area: "Área 100",
      latest_revision: "A",
      status: "DRAFT",
      planned_date: "2025-08-01",
      actual_date: null,
    },
    {
      id: "doc-005",
      document_code: "PDA-INS-A200-001",
      title: "Lista de Instrumentos",
      specialty: "Instrumentación",
      area: "Área 200",
      latest_revision: "B",
      status: "IN_REVIEW",
      planned_date: "2025-07-15",
      actual_date: null,
    },
    {
      id: "doc-006",
      document_code: "PDA-PIP-A300-001",
      title: "Isométrico de Tubería - Línea 300-PW-001",
      specialty: "Piping",
      area: "Área 300",
      latest_revision: "01",
      status: "DRAFT",
      planned_date: "2025-09-01",
      actual_date: null,
    },
    {
      id: "doc-007",
      document_code: "PDA-PRO-GEN-001",
      title: "Balance de Masa y Energía",
      specialty: "Procesos",
      area: "General",
      latest_revision: "D",
      status: "ISSUED",
      planned_date: "2025-04-15",
      actual_date: "2025-04-14",
    },
    {
      id: "doc-008",
      document_code: "PDA-CIV-A200-001",
      title: "Plano de Fundaciones - Edificio de Bombas",
      specialty: "Civil",
      area: "Área 200",
      latest_revision: "A",
      status: "APPROVED",
      planned_date: "2025-06-30",
      actual_date: "2025-06-28",
    },
    {
      id: "doc-009",
      document_code: "PDA-MEC-A100-002",
      title: "Especificación de Equipos Rotativos",
      specialty: "Mecánica",
      area: "Área 100",
      latest_revision: "B",
      status: "IN_REVIEW",
      planned_date: "2025-07-20",
      actual_date: null,
    },
    {
      id: "doc-010",
      document_code: "PDA-ELE-A200-001",
      title: "Clasificación de Áreas Eléctricas",
      specialty: "Eléctrica",
      area: "Área 200",
      latest_revision: "A",
      status: "DRAFT",
      planned_date: "2025-08-15",
      actual_date: null,
    },
  ],
  "proj-002": [
    {
      id: "doc-020",
      document_code: "GNL-CIV-001",
      title: "Plano General del Terminal",
      specialty: "Civil",
      area: "Terminal",
      latest_revision: "A",
      status: "DRAFT",
      planned_date: "2025-09-15",
      actual_date: null,
    },
    {
      id: "doc-021",
      document_code: "GNL-MEC-001",
      title: "Diagrama de Flujo de Proceso",
      specialty: "Mecánica",
      area: "Almacenamiento",
      latest_revision: "B",
      status: "IN_REVIEW",
      planned_date: "2025-09-01",
      actual_date: null,
    },
    {
      id: "doc-022",
      document_code: "GNL-ELE-001",
      title: "Sistema de Puesta a Tierra",
      specialty: "Eléctrica",
      area: "General",
      latest_revision: "A",
      status: "APPROVED",
      planned_date: "2025-08-20",
      actual_date: "2025-08-19",
    },
  ],
  "proj-003": [
    {
      id: "doc-030",
      document_code: "PRM-EST-001",
      title: "Cálculo Estructural de Tablero",
      specialty: "Estructural",
      area: "Tablero",
      latest_revision: "C",
      status: "ISSUED",
      planned_date: "2025-07-01",
      actual_date: "2025-06-30",
    },
    {
      id: "doc-031",
      document_code: "PRM-GEO-001",
      title: "Informe Geotécnico de Fundaciones",
      specialty: "Geotecnia",
      area: "General",
      latest_revision: "B",
      status: "APPROVED",
      planned_date: "2025-06-15",
      actual_date: "2025-06-14",
    },
  ],
  "proj-004": [
    {
      id: "doc-040",
      document_code: "LT220-ELE-T1-001",
      title: "Diseño de Torre Tipo A",
      specialty: "Eléctrica",
      area: "Tramo 1",
      latest_revision: "A",
      status: "IN_REVIEW",
      planned_date: "2025-10-01",
      actual_date: null,
    },
  ],
};

// ─── Transmittals ───────────────────────────────────────────────────────────

export const mockTransmittalRows: Record<string, TransmittalTableRow[]> = {
  "proj-001": [
    {
      id: "trx-001",
      transmittal_code: "PDA-TRX-001",
      recipient_name: "Minera del Norte SpA",
      document_count: 3,
      created_at: "2025-05-20T14:30:00Z",
      sender_name: "Diego García",
    },
    {
      id: "trx-002",
      transmittal_code: "PDA-TRX-002",
      recipient_name: "Constructora Vázquez",
      document_count: 2,
      created_at: "2025-06-15T09:00:00Z",
      sender_name: "María López",
    },
    {
      id: "trx-003",
      transmittal_code: "PDA-TRX-003",
      recipient_name: "Minera del Norte SpA",
      document_count: 5,
      created_at: "2025-07-01T16:45:00Z",
      sender_name: "Diego García",
    },
  ],
  "proj-002": [
    {
      id: "trx-010",
      transmittal_code: "GNL-TRX-001",
      recipient_name: "Minera del Norte SpA",
      document_count: 1,
      created_at: "2025-08-20T11:00:00Z",
      sender_name: "Diego García",
    },
  ],
  "proj-003": [],
  "proj-004": [],
};

// ─── Document Detail (for drawer) ───────────────────────────────────────────

export function getMockDocumentDetail(documentId: string): DocumentDetail | null {
  const revisions: (Revision & {
    files: FileRecord[];
    uploader_name: string;
    comments: Comment[];
  })[] = [
    {
      id: "rev-003",
      document_id: documentId,
      uploader_id: "user-001",
      uploader_name: "Diego García",
      version_label: "C",
      version_index: 3,
      status: "ISSUED",
      created_at: "2025-05-18T10:00:00Z",
      files: [
        {
          id: "file-003",
          revision_id: "rev-003",
          s3_key: `projects/proj-001/docs/${documentId}/rev-C/plano.pdf`,
          file_name: "PDA-MEC-A200-001_Rev-C.pdf",
          file_size_bytes: 4_521_000,
          created_at: "2025-05-18T10:00:00Z",
        },
      ],
      comments: [],
    },
    {
      id: "rev-002",
      document_id: documentId,
      uploader_id: "user-002",
      uploader_name: "María López",
      version_label: "B",
      version_index: 2,
      status: "APPROVED",
      created_at: "2025-04-20T14:30:00Z",
      files: [
        {
          id: "file-002",
          revision_id: "rev-002",
          s3_key: `projects/proj-001/docs/${documentId}/rev-B/plano.pdf`,
          file_name: "PDA-MEC-A200-001_Rev-B.pdf",
          file_size_bytes: 3_850_000,
          created_at: "2025-04-20T14:30:00Z",
        },
      ],
      comments: [
        {
          id: "cmt-001",
          revision_id: "rev-002",
          author_id: "user-004",
          content: "Verificar dimensiones de brida en conexión norte. Ref: Plano ISO-003.",
          status: "CLOSED",
          response_text: "Corregido en Rev C. Se actualizó la tabla de bridas.",
          closed_at: "2025-05-10T09:00:00Z",
          created_at: "2025-04-25T11:00:00Z",
        },
        {
          id: "cmt-002",
          revision_id: "rev-002",
          author_id: "user-003",
          content: "Falta nota de material para soportes tipo 3A.",
          status: "CLOSED",
          response_text: "Agregado en Rev C, ver nota 15 del cuadro de materiales.",
          closed_at: "2025-05-12T16:00:00Z",
          created_at: "2025-04-26T08:30:00Z",
        },
      ],
    },
    {
      id: "rev-001",
      document_id: documentId,
      uploader_id: "user-001",
      uploader_name: "Diego García",
      version_label: "A",
      version_index: 1,
      status: "APPROVED",
      created_at: "2025-03-15T09:00:00Z",
      files: [
        {
          id: "file-001",
          revision_id: "rev-001",
          s3_key: `projects/proj-001/docs/${documentId}/rev-A/plano.pdf`,
          file_name: "PDA-MEC-A200-001_Rev-A.pdf",
          file_size_bytes: 2_100_000,
          created_at: "2025-03-15T09:00:00Z",
        },
      ],
      comments: [],
    },
  ];

  const issuance: IssuanceLog = {
    id: "iss-001",
    revision_id: "rev-003",
    original_planned_date: "2025-05-20T00:00:00Z",
    current_planned_date: "2025-05-20T00:00:00Z",
    actual_issuance_date: "2025-05-19T00:00:00Z",
    iteration_count: 0,
    created_at: "2025-03-01T10:00:00Z",
  };

  return {
    document: {
      id: documentId,
      project_id: "proj-001",
      document_code: "PDA-MEC-A200-001",
      title: "Diagrama de Tuberías e Instrumentación (P&ID)",
      custom_properties: {
        specialty: "Mecánica",
        area: "Área 200",
        discipline_code: "MEC",
      },
      created_at: "2025-03-01T10:00:00Z",
      deleted_at: null,
    },
    revisions,
    issuance,
  };
}

// ─── Current User helper ────────────────────────────────────────────────────

export function getMockCurrentUser(): User {
  return mockUsers.find((u) => u.id === MOCK_CURRENT_USER_ID)!;
}

export function getMockCurrentOrganization(): Organization {
  return mockOrganizations.find((o) => o.id === MOCK_CURRENT_USER_ORG_ID)!;
}
