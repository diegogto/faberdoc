# Graph Report - Faberdoc  (2026-06-11)

## Corpus Check
- 115 files · ~90,925 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 727 nodes · 1682 edges · 58 communities (49 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `de7fd4a2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Document Management Dialogs & Forms|Document Management Dialogs & Forms]]
- [[_COMMUNITY_Project Dependencies & External Libraries|Project Dependencies & External Libraries]]
- [[_COMMUNITY_System Architecture & Naming Guidelines|System Architecture & Naming Guidelines]]
- [[_COMMUNITY_Revision Control & Access Verification|Revision Control & Access Verification]]
- [[_COMMUNITY_Dashboard Layout & Navigation Shell|Dashboard Layout & Navigation Shell]]
- [[_COMMUNITY_Common UI Components & Utilities|Common UI Components & Utilities]]
- [[_COMMUNITY_Authentication & Password Management Pages|Authentication & Password Management Pages]]
- [[_COMMUNITY_Review Flow Editor & Interactive Canvas|Review Flow Editor & Interactive Canvas]]
- [[_COMMUNITY_Component and Style Registries Configuration|Component and Style Registries Configuration]]
- [[_COMMUNITY_User Profile Settings & Nav Dropdown|User Profile Settings & Nav Dropdown]]
- [[_COMMUNITY_Organization Settings & Admin Storage Actions|Organization Settings & Admin Storage Actions]]
- [[_COMMUNITY_TypeScript Configuration & Compiler Options|TypeScript Configuration & Compiler Options]]
- [[_COMMUNITY_Client Connection Management Actions|Client Connection Management Actions]]
- [[_COMMUNITY_Maestro de Documentos (MDL) Table Views|Maestro de Documentos (MDL) Table Views]]
- [[_COMMUNITY_Review Flow Templates & Email Notifications|Review Flow Templates & Email Notifications]]
- [[_COMMUNITY_Transmittals UI & Emisiones Tables|Transmittals UI & Emisiones Tables]]
- [[_COMMUNITY_Authentication Route Handlers & Direct Links|Authentication Route Handlers & Direct Links]]
- [[_COMMUNITY_Storage Service Providers & S3 Adapters|Storage Service Providers & S3 Adapters]]
- [[_COMMUNITY_Onboarding and User Access Requests Flow|Onboarding and User Access Requests Flow]]
- [[_COMMUNITY_Resend SMTP Email Integration & Signup Actions|Resend SMTP Email Integration & Signup Actions]]
- [[_COMMUNITY_User Activity Timeline & Metric Cards|User Activity Timeline & Metric Cards]]
- [[_COMMUNITY_Document Drawer & Comment System Panels|Document Drawer & Comment System Panels]]
- [[_COMMUNITY_Mock Data Providers & Entity Seeders|Mock Data Providers & Entity Seeders]]
- [[_COMMUNITY_Shadcnui Sheet & Lateral Slider Layout|Shadcn/ui Sheet & Lateral Slider Layout]]
- [[_COMMUNITY_Input Groups and Textarea UI Elements|Input Groups and Textarea UI Elements]]
- [[_COMMUNITY_Revision Timeline & File Download Actions|Revision Timeline & File Download Actions]]
- [[_COMMUNITY_Project Issues (Incidencias) Dashboard|Project Issues (Incidencias) Dashboard]]
- [[_COMMUNITY_Dynamic Tables Columns & Status Badges|Dynamic Tables Columns & Status Badges]]
- [[_COMMUNITY_Entity Type Definitions & Domain Interfaces|Entity Type Definitions & Domain Interfaces]]
- [[_COMMUNITY_Document Creation & Naming Engine Actions|Document Creation & Naming Engine Actions]]
- [[_COMMUNITY_Supabase Proxy & Session Handlers|Supabase Proxy & Session Handlers]]
- [[_COMMUNITY_Skeleton Loaders & Loading Components|Skeleton Loaders & Loading Components]]
- [[_COMMUNITY_Dashboard Header Tabs & Top Bar Navigation|Dashboard Header Tabs & Top Bar Navigation]]
- [[_COMMUNITY_Project Workspace Pages|Project Workspace Pages]]
- [[_COMMUNITY_Agent Rules & Claude Integrations|Agent Rules & Claude Integrations]]
- [[_COMMUNITY_Developer Sessions Log & Task Checklist|Developer Sessions Log & Task Checklist]]
- [[_COMMUNITY_ESLint Configuration|ESLint Configuration]]
- [[_COMMUNITY_Next.js Standalone Config|Next.js Standalone Config]]
- [[_COMMUNITY_PostCSS Style Preprocessors|PostCSS Style Preprocessors]]
- [[_COMMUNITY_README Setup Documentation|README Setup Documentation]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 100 edges
2. `createClient()` - 91 edges
3. `createAdminClient()` - 58 edges
4. `Button()` - 25 edges
5. `checkIfProjectArchived()` - 24 edges
6. `getRequestOrigin()` - 22 edges
7. `sendEmail()` - 16 edges
8. `compilerOptions` - 16 edges
9. `Faberdoc - Registro de Sesiones (Sessions Log)` - 16 edges
10. `Dialog()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `proxy()` --calls--> `updateSession()`  [EXTRACTED]
  proxy.ts → src/lib/supabase/proxy.ts
- `ResetPasswordPage()` --calls--> `createClient()`  [EXTRACTED]
  src/app/(auth)/reset-password/page.tsx → src/lib/supabase/server.ts
- `DashboardLayout()` --calls--> `createClient()`  [EXTRACTED]
  src/app/(dashboard)/layout.tsx → src/lib/supabase/server.ts
- `SettingsPage()` --calls--> `getProjectSettingsDataAction()`  [INFERRED]
  src/app/(dashboard)/projects/[projectId]/settings/page.tsx → src/app/(dashboard)/projects/[projectId]/mdl/actions.ts
- `SidebarSection()` --calls--> `cn()`  [EXTRACTED]
  src/components/layout/sidebar.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (58 total, 9 thin omitted)

### Community 0 - "Document Management Dialogs & Forms"
Cohesion: 0.06
Nodes (82): DocumentCreateDialogProps, DocumentImportDialogProps, Step, DocumentToolbarProps, STATUS_OPTIONS, CustomPropertyDef, FlowCondition, FlowConfigManager() (+74 more)

### Community 1 - "Project Dependencies & External Libraries"
Cohesion: 0.05
Nodes (40): dependencies, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, @base-ui/react, class-variance-authority, clsx, cmdk, lucide-react (+32 more)

### Community 2 - "System Architecture & Naming Guidelines"
Cohesion: 0.11
Nodes (22): Separation of Comments and Issues, Dokploy Deployment, Naming Engine, Organizations & Role Hierarchy, Storage Service Abstraction, Transmittals (Formal Shipments), Versioning Logic (MIXED vs SEPARATE_EMISSION), masterplan.md (System Architecture & Development Plan) (+14 more)

### Community 3 - "Revision Control & Access Verification"
Cohesion: 0.21
Nodes (19): ReviewFlow, formatIterationLabel(), initiateWorkflow(), matchFlowForDocument(), resolveTargetNodes(), transitionWorkflow(), addIssueToRevisionAction(), createNextRevisionAction() (+11 more)

### Community 4 - "Dashboard Layout & Navigation Shell"
Cohesion: 0.26
Nodes (8): SidebarProjectItem(), SidebarSection(), ScrollArea(), ScrollBar(), Separator(), Tooltip(), TooltipContent(), TooltipTrigger()

### Community 5 - "Common UI Components & Utilities"
Cohesion: 0.13
Nodes (21): DocumentCreateDialog(), DocumentDrawer(), DocumentImportDialog(), DocumentTable(), ProjectRole, DocumentToolbar(), TransmittalTableRow, EmptyState() (+13 more)

### Community 6 - "Authentication & Password Management Pages"
Cohesion: 0.18
Nodes (7): ForgotPasswordPageProps, loginAction(), verifyOtpAction(), LoginPageProps, VerifyPageProps, Logo(), LogoProps

### Community 7 - "Review Flow Editor & Interactive Canvas"
Cohesion: 0.10
Nodes (16): FlowConfigManagerProps, buildInitialEdges(), buildInitialNodes(), FlowConfig, FlowEditor(), FlowEditorProps, HANDLE_COLORS, NODE_TYPES (+8 more)

### Community 8 - "Component and Style Registries Configuration"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 9 - "User Profile Settings & Nav Dropdown"
Cohesion: 0.09
Nodes (22): DashboardLayout(), Sidebar(), SidebarProps, getUserInitials(), UserNav(), UserNavProps, ProjectWithRole, User (+14 more)

### Community 10 - "Organization Settings & Admin Storage Actions"
Cohesion: 0.22
Nodes (12): changeUserRoleAction(), checkCallerIsAdmin(), handleJoinRequestAction(), inviteUserAction(), inviteUserSchema, removeUserFromOrgAction(), updateOrganizationAction(), updateOrganizationSchema (+4 more)

### Community 11 - "TypeScript Configuration & Compiler Options"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 12 - "Client Connection Management Actions"
Cohesion: 0.16
Nodes (14): GET(), GET(), GET(), addRecipientMemberAction(), connectClientAction(), connectClientSchema, getCorporateDomain(), getProjectClientsAction() (+6 more)

### Community 13 - "Maestro de Documentos (MDL) Table Views"
Cohesion: 0.29
Nodes (8): generateDocumentColumns(), DocumentTableProps, DocumentTableRow, IssueStatus, RevisionStatus, STATUS_CONFIG, StatusBadge(), StatusBadgeProps

### Community 15 - "Transmittals UI & Emisiones Tables"
Cohesion: 0.09
Nodes (22): RevisionTimeline(), RevisionTimelineProps, mockDocumentRows, mockOrganizations, mockProjects, mockProjectsWithRole, mockTransmittalRows, mockUsers (+14 more)

### Community 16 - "Authentication Route Handlers & Direct Links"
Cohesion: 0.33
Nodes (4): geistMono, geistSans, metadata, TooltipProvider()

### Community 17 - "Storage Service Providers & S3 Adapters"
Cohesion: 0.22
Nodes (3): R2StorageService, StorageService, SupabaseStorageService

### Community 18 - "Onboarding and User Access Requests Flow"
Cohesion: 0.26
Nodes (14): acceptInvitationAction(), cancelJoinRequestAction(), claimOrgAction(), completeOnboardingAction(), getCorporateDomain(), joinExistingOrgAction(), onboardingSchema, PUBLIC_DOMAINS (+6 more)

### Community 19 - "Resend SMTP Email Integration & Signup Actions"
Cohesion: 0.13
Nodes (21): sendEmail(), BaseEmailOptions, getBaseEmailLayout(), getClientConnectionEmailHtml(), getDocumentApprovedEmailHtml(), getDocumentCommentedEmailHtml(), getInviteEmailHtml(), getJoinRequestEmailHtml() (+13 more)

### Community 20 - "User Activity Timeline & Metric Cards"
Cohesion: 0.21
Nodes (11): ActivityItem, DashboardData, extractName(), extractOrgName(), getDashboardDataAction(), DashboardPage(), CreateProjectButton(), EmptyProjectsView() (+3 more)

### Community 21 - "Document Drawer & Comment System Panels"
Cohesion: 0.16
Nodes (20): DeletedDocument, DeletedProject, archiveProjectAction(), assignProjectMemberAction(), checkIfProjectArchived(), createProjectAction(), createProjectSchema, deleteProjectAction() (+12 more)

### Community 22 - "Mock Data Providers & Entity Seeders"
Cohesion: 0.18
Nodes (10): Faberdoc - Lista de Pendientes (TODO), I. Infraestructura, Despliegue y Monetización (Backbone), II. Autenticación, Organización y Gestión de Usuarios, III. Gestión de Proyectos y Configuración, IV. Maestro de Documentos (Tablas, Ordenamiento y Filtros), IX. Preguntas y Hallazgos de Graphify, V. Ciclo de Vida Documental y Flujos de Revisión, VI. Emisiones, Programador y Transmittals (+2 more)

### Community 23 - "Shadcn/ui Sheet & Lateral Slider Layout"
Cohesion: 0.12
Nodes (14): DocumentDrawerProps, ProjectRole, PROPERTY_ICONS, PROPERTY_LABELS, DocumentDetail, SystemComment, createClient(), Sheet() (+6 more)

### Community 24 - "Input Groups and Textarea UI Elements"
Cohesion: 0.20
Nodes (9): A. Registros DKIM (TXT), B. Registro SPF (TXT), C. Registro MX (Mail Exchange), Configuración de Resend y Cloudflare DNS, D. Configuración de DMARC (Altamente Recomendado), Especificaciones de los registros en Cloudflare:, Paso 1: Agregar el Dominio en Resend, Paso 2: Configurar los Registros DNS en Cloudflare (+1 more)

### Community 25 - "Revision Timeline & File Download Actions"
Cohesion: 0.22
Nodes (8): 1. DESCRIPCIÓN GENERAL Y OBJETIVOS, 2. STACK TECNOLÓGICO, 3. ESTRUCTURA DEL PROYECTO (Next.js), **4\. SISTEMA DE AUTENTICACIÓN Y ROLES**, **5\. ESQUEMA DE BASE DE DATOS (SQL PARA SUPABASE)**, **6\. FLUJOS PRINCIPALES DE LA APLICACIÓN**, **7\. DESPLIEGUE Y DEVOPS (DOKPLOY)**, PLAN DE DESARROLLO Y ARQUITECTURA: FABERDOC

### Community 26 - "Project Issues (Incidencias) Dashboard"
Cohesion: 0.50
Nodes (4): 1. Cambios en Código (Next.js & Supabase integration), [2026-05-19] Sesión 2: Flujo de Onboarding Completo, Prevención de Duplicados Corporativos e Integración de Admin Client, 2. Cambios en Base de Datos (Supabase), 3. Plan de Control e Integridad

### Community 27 - "Dynamic Tables Columns & Status Badges"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 28 - "Entity Type Definitions & Domain Interfaces"
Cohesion: 0.50
Nodes (4): 1. Cambios en Código (Base UI Select format), [2026-06-01] Sesión 12: Corrección de Visualización en Selectores Base UI (SelectValue format rendering), 2. Cambios en Base de Datos, 3. Plan de Control e Integridad

### Community 29 - "Document Creation & Naming Engine Actions"
Cohesion: 0.17
Nodes (23): IssuesPage(), IssuesPageProps, bulkImportDocumentsAction(), createDocumentAction(), deleteDocumentAction(), documentSchema, generateDocumentCode(), getDocumentDetailAction() (+15 more)

### Community 30 - "Supabase Proxy & Session Handlers"
Cohesion: 0.60
Nodes (3): config, proxy(), updateSession()

### Community 32 - "Dashboard Header Tabs & Top Bar Navigation"
Cohesion: 0.50
Nodes (4): 1. Cambios en Código e Infraestructura (Next.js), [2026-05-18] Sesión 1: Resolución de Enrutamiento, Diagnóstico de Auth y Corrección de UI, 2. Cambios en Base de Datos (Supabase), 3. Plan de Control e Integridad

### Community 34 - "Agent Rules & Claude Integrations"
Cohesion: 0.50
Nodes (4): 1. Cambios en Código (Next.js & Cleanup), [2026-05-22] Sesión 5: Limpieza de `org_type` y Resolución de Conexión de Base de Datos (Supavisor), 2. Cambios en Base de Datos e Infraestructura (Docker / Supavisor), 3. Plan de Control e Integridad

### Community 39 - "README Setup Documentation"
Cohesion: 0.50
Nodes (4): 1. Cambios en Código (Next.js & Frontend), [2026-05-23] Sesión 6: Ciclo de Vida Documental, Configuración de Proyectos y Transmittals, 2. Cambios en Base de Datos, 3. Plan de Control e Integridad

### Community 42 - "Community 42"
Cohesion: 0.50
Nodes (4): 1. Cambios en Código (Next.js & Frontend), [2026-05-25] Sesión 7: Corrección de Onboarding, Solicitud y Aprobación de Acceso a Organizaciones, 2. Cambios en Base de Datos e Integridad, 3. Plan de Control e Integridad

### Community 43 - "Community 43"
Cohesion: 0.50
Nodes (4): 1. Cambios en Código (Next.js & Frontend), [2026-05-31] Sesión 9: Solución de Recuperación de Contraseña, Optimización de Logs, Feedback de Formulario y Soporte para Gestores de Contraseña, 2. Cambios en Base de Datos e Infraestructura, 3. Plan de Control e Integridad

### Community 44 - "Community 44"
Cohesion: 0.50
Nodes (4): 1. Cambios en Código (Next.js & Resend API), [2026-06-01] Sesión 11: Correos de Solicitud de Acceso con Enlaces de Aprobación/Rechazo Directos, 2. Cambios en Base de Datos, 3. Plan de Control e Integridad

### Community 45 - "Community 45"
Cohesion: 0.50
Nodes (4): 1. Cambios en Código (Next.js & Styling), [2026-05-25] Sesión 8: Integración de Logo, Paleta de Colores de Marca y Corrección de Hidratación (Hydration Mismatch), 2. Cambios en Base de Datos, 3. Plan de Control e Integridad

### Community 46 - "Community 46"
Cohesion: 0.50
Nodes (4): 1. Cambios en Código (Next.js & Supabase), [2026-06-01] Sesión 10: Control de Acceso por Roles, Modo de Solo Lectura en FlowEditor, Confirmaciones Modernizadas y Métricas en Dashboard, 2. Cambios en Base de Datos, 3. Plan de Control e Integridad

### Community 47 - "Community 47"
Cohesion: 0.50
Nodes (4): 1. Cambios en Código (Next.js & Supabase integration), [2026-05-20] Sesión 3: Master Document List (MDL), Nomenclatura Dinámica e Importación CSV, 2. Cambios en Base de Datos (Supabase), 3. Plan de Control e Integridad

### Community 48 - "Community 48"
Cohesion: 0.50
Nodes (4): 1. Cambios en Código (Next.js & Supabase integration), [2026-05-22] Sesión 4: Restablecimiento de Contraseña, Panel de Perfil y Organización, y Onboarding Adaptativo, 2. Cambios en Base de Datos (Supabase), 3. Plan de Control e Integridad

### Community 49 - "Community 49"
Cohesion: 0.50
Nodes (4): 1. Cambios en Código (Next.js & UI), [2026-06-01] Sesión 13: Archivar Proyecto, Eliminación Lógica y Papelera de Reciclaje de 30 días, 2. Cambios en Base de Datos (Supabase), 3. Plan de Control e Integridad

### Community 50 - "Community 50"
Cohesion: 0.50
Nodes (4): 1. Cambios en Código (Next.js & UI), [2026-06-01] Sesión 14: Limpieza de Terminología, Soporte de Logotipo en Sidebar y Alineación del Schema Maestro, 2. Cambios en Base de Datos (Supabase), 3. Plan de Control e Integridad

### Community 52 - "Community 52"
Cohesion: 0.40
Nodes (4): resetPasswordAction(), ResetPasswordPage(), ResetPasswordPageProps, ResetPasswordFormClient()

### Community 53 - "Community 53"
Cohesion: 0.33
Nodes (5): 1. Cambios en Código (Next.js & Refactoring), [2026-06-11] Sesión 15: Refactorización de Consultas a Server Actions en Rutas de Proyectos, 2. Cambios en Base de Datos (Supabase), 3. Plan de Control e Integridad, Faberdoc - Registro de Sesiones (Sessions Log)

### Community 54 - "Community 54"
Cohesion: 0.40
Nodes (3): IssuesClient(), IssuesClientProps, IssueViewModel

### Community 55 - "Community 55"
Cohesion: 0.70
Nodes (4): addCommentAction(), checkIfProjectArchived(), getCommentsAction(), verifyUserProjectAccess()

### Community 57 - "Community 57"
Cohesion: 0.50
Nodes (3): TABS, TopBar(), TopBarProps

## Knowledge Gaps
- **239 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+234 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Document Management Dialogs & Forms` to `Dashboard Layout & Navigation Shell`, `Common UI Components & Utilities`, `Authentication & Password Management Pages`, `User Profile Settings & Nav Dropdown`, `Community 54`, `Shadcn/ui Sheet & Lateral Slider Layout`, `Community 57`, `Skeleton Loaders & Loading Components`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Document Creation & Naming Engine Actions` to `System Architecture & Naming Guidelines`, `Revision Control & Access Verification`, `Authentication & Password Management Pages`, `User Profile Settings & Nav Dropdown`, `Organization Settings & Admin Storage Actions`, `Client Connection Management Actions`, `Onboarding and User Access Requests Flow`, `Resend SMTP Email Integration & Signup Actions`, `User Activity Timeline & Metric Cards`, `Community 52`, `Document Drawer & Comment System Panels`, `Community 55`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Why does `createAdminClient()` connect `Onboarding and User Access Requests Flow` to `Revision Control & Access Verification`, `Organization Settings & Admin Storage Actions`, `Client Connection Management Actions`, `Storage Service Providers & S3 Adapters`, `Resend SMTP Email Integration & Signup Actions`, `Document Drawer & Comment System Panels`, `Document Creation & Naming Engine Actions`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `createAdminClient()` (e.g. with `.createSignedUploadUrl()` and `.deleteFile()`) actually correct?**
  _`createAdminClient()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _239 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Document Management Dialogs & Forms` be split into smaller, more focused modules?**
  _Cohesion score 0.0551930876388644 - nodes in this community are weakly interconnected._
- **Should `Project Dependencies & External Libraries` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._