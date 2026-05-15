# PLAN DE DESARROLLO Y ARQUITECTURA: FABERDOC

## 1. DESCRIPCIÓN GENERAL Y OBJETIVOS
[cite_start]Faberdoc es una aplicación Web que gestiona la generación de documentos y su emisión a clientes e incumbentes[cite: 656]. [cite_start]La app permitirá: Login y Registro de usuarios[cite: 657]. [cite_start]Dependiendo de los permisos que tenga el usuario podrán subir documentos, aprobar, descargar, etc[cite: 657]. [cite_start]Cada usuario tendrá su dashboard propio, donde podrá ver los documentos propios que debe generar, revisar y los últimos documentos emitidos[cite: 657].

## 2. STACK TECNOLÓGICO
- [cite_start]**Frontend / Framework:** Next.js y Tailwind CSS[cite: 659].
- [cite_start]**Base de datos:** Supabase (Postgres)[cite: 659].
- [cite_start]**Autenticación:** Sistema de autenticación de Login y Registro de usuarios usando Supabase[cite: 659, 660].
- [cite_start]**DevOps y Despliegue:** Git y GitHub para control de versiones[cite: 665]. [cite_start]Hosting VPS preparado para desplegarse en Dokploy[cite: 664].

## 3. ESTRUCTURA DEL PROYECTO (Next.js)
[cite_start]El editor mapeará rutas, carpetas, componentes, librerías y organización del código[cite: 664].

```text
faberdoc/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx
│   │   │   ├── projects/
│   │   │   ├── transmittals/
│   │   │   └── billing/
│   │   └── api/
│   ├── components/
│   ├── lib/
│   ├── types/
│   └── actions/
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── docker-compose.yml
├── Dockerfile
└── tailwind.config.ts
```

## **4\. SISTEMA DE AUTENTICACIÓN Y ROLES**

* **Supabase Auth:** Manejará el registro y login. El ID de auth.users se vinculará a la tabla pública users.  
* **Jerarquía:** 1\. Organization (Dueño, Cliente, Subcontratista). 2\. User (Pertenece a una organización). 3\. ProjectOrganization y ProjectMember (Roles específicos por proyecto: ADMIN, REVIEWER, OWNER\_APPROVER, VIEWER).

## **5\. ESQUEMA DE BASE DE DATOS (SQL PARA SUPABASE)**

Este esquema incluye la trazabilidad documental, las propiedades dinámicas (JSONB) y el control de suscripciones activas y gastos asociados a cada organización.

```sql
-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANIZACIONES Y USUARIOS
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    org_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SUSCRIPCIONES Y GASTOS ACTIVOS
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    storage_limit_mb INTEGER NOT NULL,
    projects_limit INTEGER NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscription_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES subscriptions(id) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    billing_date TIMESTAMPTZ NOT NULL,
    invoice_url TEXT,
    payment_status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROYECTOS Y CONFIGURACIÓN DINÁMICA
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    naming_pattern VARCHAR(255) NOT NULL,
    custom_properties_definition JSONB NOT NULL,
    client_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE project_members (
    project_id UUID REFERENCES projects(id),
    user_id UUID REFERENCES users(id),
    role VARCHAR(50) NOT NULL,
    PRIMARY KEY (project_id, user_id)
);

-- 4. DOCUMENTOS Y REVISIONES
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    document_code VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    custom_properties JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(project_id, document_code)
);

CREATE INDEX idx_documents_project_code ON documents(project_id, document_code);

CREATE TABLE revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) NOT NULL,
    uploader_id UUID REFERENCES users(id) NOT NULL,
    version_label VARCHAR(20) NOT NULL,
    version_index INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    revision_id UUID REFERENCES revisions(id) NOT NULL,
    s3_key TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. LÓGICA DE EMISIONES Y FEEDBACK
CREATE TABLE issuance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    revision_id UUID REFERENCES revisions(id) NOT NULL,
    original_planned_date TIMESTAMPTZ NOT NULL,
    current_planned_date TIMESTAMPTZ NOT NULL,
    actual_issuance_date TIMESTAMPTZ,
    iteration_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transmittals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) NOT NULL,
    transmittal_code VARCHAR(255) NOT NULL,
    sender_id UUID REFERENCES users(id) NOT NULL,
    recipient_org_id UUID REFERENCES organizations(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    revision_id UUID REFERENCES revisions(id) NOT NULL,
    author_id UUID REFERENCES users(id) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    response_text TEXT,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Nota para Supabase:** El editor deberá generar las políticas RLS (Row Level Security) asegurando que los usuarios solo accedan a los datos donde su `organization_id` o `user_id` tenga relación mediante `project_members` o `transmittals`.

## **6\. FLUJOS PRINCIPALES DE LA APLICACIÓN**

1. **Onboarding / Auth:** Login vía Supabase. Si la organización tiene su suscripción en PAST\_DUE, el sistema entra en modo "Read-Only".
2. **Dashboard de Usuario:** Cruce de datos entre issuance\_logs, revisions (status) y project\_members para listar "Mis tareas pendientes" (Documentos por subir, aprobar o responder).
3. **Master Delivery List (MDL):** Tabla interactiva principal. Al hacer click en una fila, se abre un Sheet (Drawer lateral) mostrando los metadatos JSONB y la línea de tiempo de revisiones.
4. **Flujo de Revisión y Cierre:** Carga de documento \-\> Revisión interna \-\> Aprobación \-\> Creación de Transmittal \-\> El cliente externo recibe, descarga, comenta \-\> Se cargan los comentarios (status OPEN) \-\> Se "arrastran" los comentarios abiertos a la siguiente versión hasta su cierre (CLOSED).

## **7\. DESPLIEGUE Y DEVOPS (DOKPLOY)**

* **Repositorio:** Todo el código versionado en GitHub.
* **Preparación para VPS:** La aplicación Next.js se compilará usando output: 'standalone' en el archivo next.config.js.
* **Dokploy:** 1\. Se conectará el VPS a GitHub mediante Dokploy. 2\. Se configurará un entorno Dockerizado usando el Dockerfile optimizado para Next.js. 3\. Las variables de entorno (SUPABASE\_URL, SUPABASE\_ANON\_KEY, SUPABASE\_SERVICE\_ROLE\_KEY) se inyectarán de forma segura en la interfaz de Dokploy.
