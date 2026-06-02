-- ══════════════════════════════════════════════════════════════
-- Faberdoc — Initial Schema Migration
-- Ejecutar en: Supabase SQL Editor (self-hosted)
-- ══════════════════════════════════════════════════════════════

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. ORGANIZACIONES Y USUARIOS ────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email_domain VARCHAR(255),
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_organizations_email_domain ON organizations(email_domain);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. SUSCRIPCIONES Y GASTOS ───────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('ACTIVE', 'PAST_DUE', 'CANCELED')),
    storage_limit_mb INTEGER NOT NULL,
    projects_limit INTEGER NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES subscriptions(id) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    billing_date TIMESTAMPTZ NOT NULL,
    invoice_url TEXT,
    payment_status VARCHAR(50) NOT NULL CHECK (payment_status IN ('PAID', 'PENDING', 'FAILED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. PROYECTOS Y MIEMBROS ─────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    location_details JSONB,
    client_name VARCHAR(255),
    naming_pattern VARCHAR(255) NOT NULL,
    versioning_logic VARCHAR(50) DEFAULT 'MIXED' CHECK (versioning_logic IN ('MIXED', 'SEPARATE_EMISSION')),
    versioning_format_config JSONB DEFAULT '{
      "version_format": {
        "type": "numeric",
        "padding": 2,
        "starting_value": 0
      },
      "emission_types": [
        {"name": "Para Revisi\u00f3n", "code": "B"},
        {"name": "Aprobado para Construcci\u00f3n", "code": "IFC"},
        {"name": "As Built", "code": "ASB"}
      ],
      "emission_pattern": "{CODE} - Rev {REV}"
    }'::JSONB,
    review_flow_config JSONB DEFAULT '{}'::JSONB,
    custom_properties_definition JSONB NOT NULL DEFAULT '[]'::JSONB,
    client_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    archived_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS project_members (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'COORDINATOR', 'REVIEWER', 'OWNER_APPROVER', 'VIEWER', 'UPLOADER')),
    PRIMARY KEY (project_id, user_id)
);

-- Vinculación segura de organizaciones receptoras/clientes a proyectos
CREATE TABLE IF NOT EXISTS project_connections (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
    contact_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (project_id, organization_id)
);

-- ── 4. DOCUMENTOS, REVISIONES Y ARCHIVOS ────────────────────

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    document_code VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    custom_properties JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(project_id, document_code)
);

CREATE INDEX IF NOT EXISTS idx_documents_project_code ON documents(project_id, document_code);

CREATE TABLE IF NOT EXISTS revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    uploader_id UUID REFERENCES users(id) NOT NULL,
    version_label VARCHAR(20) NOT NULL,
    version_index INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('DRAFT', 'IN_REVIEW', 'COMMENTED', 'APPROVED', 'ISSUED')),
    emission_code VARCHAR(50),
    comment_level VARCHAR(20) CHECK (comment_level IN ('MINOR', 'MAJOR')),
    current_flow_id VARCHAR(100),
    active_nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    revision_id UUID REFERENCES revisions(id) ON DELETE CASCADE NOT NULL,
    s3_key TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. EMISIONES, TRANSMITTALS Y COMENTARIOS ────────────────

CREATE TABLE IF NOT EXISTS issuance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    revision_id UUID REFERENCES revisions(id) ON DELETE CASCADE NOT NULL,
    original_planned_date TIMESTAMPTZ NOT NULL,
    current_planned_date TIMESTAMPTZ NOT NULL,
    actual_issuance_date TIMESTAMPTZ,
    iteration_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transmittals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    transmittal_code VARCHAR(255) NOT NULL,
    sender_id UUID REFERENCES users(id) NOT NULL,
    recipient_org_id UUID REFERENCES organizations(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla intermedia: vincula transmittals con revisiones específicas
CREATE TABLE IF NOT EXISTS transmittal_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transmittal_id UUID REFERENCES transmittals(id) ON DELETE CASCADE NOT NULL,
    revision_id UUID REFERENCES revisions(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    revision_id UUID REFERENCES revisions(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES users(id) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('OPEN', 'RESPONDED', 'CLOSED')),
    response_text TEXT,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    email VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, email)
);

CREATE TABLE IF NOT EXISTS join_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) — Políticas básicas
-- ══════════════════════════════════════════════════════════════

-- Habilitar RLS en todas las tablas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE issuance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transmittals ENABLE ROW LEVEL SECURITY;
ALTER TABLE transmittal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view connections for their projects"
    ON project_connections FOR SELECT
    USING (
        project_id IN (
            SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid()
        )
        OR
        organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Project admins can insert connections"
    ON project_connections FOR INSERT
    WITH CHECK (
        public.is_project_admin(auth.uid(), project_id) = TRUE
    );

CREATE POLICY "Project admins can delete connections"
    ON project_connections FOR DELETE
    USING (
        public.is_project_admin(auth.uid(), project_id) = TRUE
    );

CREATE POLICY "Client admins can update connection status"
    ON project_connections FOR UPDATE
    USING (
        public.is_user_admin(auth.uid(), organization_id) = TRUE
    )
    WITH CHECK (
        public.is_user_admin(auth.uid(), organization_id) = TRUE
    );

-- ── Políticas: Usuarios ven datos de sus proyectos ──────────

-- Organizations: Usuarios ven su propia organización y las de proyectos compartidos
CREATE POLICY "Users can view their own organization"
    ON organizations FOR SELECT
    USING (
        id IN (
            SELECT organization_id FROM users WHERE id = (SELECT auth.uid())
        )
        OR
        id IN (
            SELECT p.organization_id FROM projects p
            JOIN project_members pm ON pm.project_id = p.id
            WHERE pm.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Admins can update their own organization"
    ON organizations FOR UPDATE
    USING (
        public.is_user_admin(auth.uid(), id) = TRUE
    )
    WITH CHECK (
        public.is_user_admin(auth.uid(), id) = TRUE
    );

-- Función auxiliar segura para obtener la organización del usuario sin causar recursión
CREATE OR REPLACE FUNCTION public.get_user_org(user_uuid UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
    SELECT organization_id FROM public.users WHERE id = user_uuid;
$$;

-- Users: Usuarios ven miembros de su organización y solicitantes de acceso
CREATE POLICY "Users can view members of their organization or join requesters"
    ON users FOR SELECT
    USING (
        id = auth.uid()
        OR organization_id = public.get_user_org(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.join_requests jr
            WHERE jr.user_id = users.id
              AND jr.organization_id = public.get_user_org(auth.uid())
        )
    );

-- Users: Pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (id = (SELECT auth.uid()));

-- Función auxiliar de seguridad para verificar si un usuario es administrador de su organización
CREATE OR REPLACE FUNCTION public.is_user_admin(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = user_uuid AND organization_id = org_uuid AND is_admin = TRUE
    );
$$;

-- Projects: Usuarios ven proyectos donde son miembros o administradores
CREATE POLICY "Users can view their projects"
    ON projects FOR SELECT
    USING (
        (
            public.is_user_admin(auth.uid(), organization_id) = TRUE
        )
        OR (
            id IN (
                SELECT project_id FROM public.project_members
                WHERE user_id = auth.uid()
            )
            AND deleted_at IS NULL
        )
    );

CREATE POLICY "Admins can insert projects"
    ON projects FOR INSERT
    WITH CHECK (
        public.is_user_admin(auth.uid(), organization_id) = TRUE
    );

CREATE POLICY "Admins and Coordinators can update their projects"
    ON projects FOR UPDATE
    USING (
        public.is_user_admin(auth.uid(), organization_id) = TRUE
        OR id IN (
            SELECT project_id FROM public.project_members
            WHERE user_id = auth.uid() AND role IN ('ADMIN', 'COORDINATOR')
        )
    )
    WITH CHECK (
        public.is_user_admin(auth.uid(), organization_id) = TRUE
        OR id IN (
            SELECT project_id FROM public.project_members
            WHERE user_id = auth.uid() AND role IN ('ADMIN', 'COORDINATOR')
        )
    );

-- Función auxiliar de seguridad para romper la recursión infinita en RLS
CREATE OR REPLACE FUNCTION public.get_user_projects(user_uuid UUID)
RETURNS TABLE(project_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
    SELECT project_id FROM public.project_members WHERE user_id = user_uuid;
$$;

-- Project members: Ver miembros de proyectos propios
CREATE POLICY "Users can view project members"
    ON project_members FOR SELECT
    USING (
        project_id IN (
            SELECT public.get_user_projects(auth.uid())
        )
    );

-- Función auxiliar de seguridad para verificar si un usuario es administrador de la organización dueña del proyecto
CREATE OR REPLACE FUNCTION public.is_project_admin(user_uuid UUID, proj_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.projects p ON p.organization_id = u.organization_id
        WHERE u.id = user_uuid AND p.id = proj_uuid AND u.is_admin = TRUE
    );
$$;

CREATE POLICY "Admins can insert members"
    ON project_members FOR INSERT
    WITH CHECK (
        public.is_project_admin(auth.uid(), project_id) = TRUE
    );

CREATE POLICY "Admins and coordinators can update project members"
    ON project_members FOR UPDATE
    USING (
        public.is_project_admin(auth.uid(), project_id) = TRUE
        OR EXISTS (
            SELECT 1 FROM public.project_members caller_pm
            WHERE caller_pm.project_id = project_members.project_id
              AND caller_pm.user_id = auth.uid()
              AND caller_pm.role IN ('ADMIN', 'COORDINATOR')
        )
    )
    WITH CHECK (
        public.is_project_admin(auth.uid(), project_id) = TRUE
        OR EXISTS (
            SELECT 1 FROM public.project_members caller_pm
            WHERE caller_pm.project_id = project_members.project_id
              AND caller_pm.user_id = auth.uid()
              AND caller_pm.role IN ('ADMIN', 'COORDINATOR')
        )
    );

CREATE POLICY "Admins and coordinators can delete project members"
    ON project_members FOR DELETE
    USING (
        public.is_project_admin(auth.uid(), project_id) = TRUE
        OR EXISTS (
            SELECT 1 FROM public.project_members caller_pm
            WHERE caller_pm.project_id = project_members.project_id
              AND caller_pm.user_id = auth.uid()
              AND caller_pm.role IN ('ADMIN', 'COORDINATOR')
        )
    );

-- Documents: Usuarios ven documentos de sus proyectos
CREATE POLICY "Users can view project documents"
    ON documents FOR SELECT
    USING (
        project_id IN (
            SELECT project_id FROM project_members
            WHERE user_id = (SELECT auth.uid())
        )
        AND deleted_at IS NULL
    );

-- Revisions: Usuarios ven revisiones de documentos de sus proyectos
CREATE POLICY "Users can view document revisions"
    ON revisions FOR SELECT
    USING (
        document_id IN (
            SELECT d.id FROM documents d
            JOIN project_members pm ON pm.project_id = d.project_id
            WHERE pm.user_id = (SELECT auth.uid())
            AND d.deleted_at IS NULL
        )
    );

-- Files: Usuarios ven archivos de revisiones de sus proyectos
CREATE POLICY "Users can view revision files"
    ON files FOR SELECT
    USING (
        revision_id IN (
            SELECT r.id FROM revisions r
            JOIN documents d ON d.id = r.document_id
            JOIN project_members pm ON pm.project_id = d.project_id
            WHERE pm.user_id = (SELECT auth.uid())
        )
    );

-- Transmittals: Usuarios ven transmittals de sus proyectos
CREATE POLICY "Users can view project transmittals"
    ON transmittals FOR SELECT
    USING (
        project_id IN (
            SELECT project_id FROM project_members
            WHERE user_id = (SELECT auth.uid())
        )
    );

-- Transmittal items: Misma visibilidad que transmittals padre
CREATE POLICY "Users can view transmittal items"
    ON transmittal_items FOR SELECT
    USING (
        transmittal_id IN (
            SELECT t.id FROM transmittals t
            JOIN project_members pm ON pm.project_id = t.project_id
            WHERE pm.user_id = (SELECT auth.uid())
        )
    );

-- Comments: Usuarios ven comentarios de documentos de sus proyectos
CREATE POLICY "Users can view revision comments"
    ON comments FOR SELECT
    USING (
        revision_id IN (
            SELECT r.id FROM revisions r
            JOIN documents d ON d.id = r.document_id
            JOIN project_members pm ON pm.project_id = d.project_id
            WHERE pm.user_id = (SELECT auth.uid())
        )
    );

-- Issuance logs: Misma visibilidad que revisiones
CREATE POLICY "Users can view issuance logs"
    ON issuance_logs FOR SELECT
    USING (
        revision_id IN (
            SELECT r.id FROM revisions r
            JOIN documents d ON d.id = r.document_id
            JOIN project_members pm ON pm.project_id = d.project_id
            WHERE pm.user_id = (SELECT auth.uid())
        )
    );

-- Subscriptions: Solo la organización propia
CREATE POLICY "Users can view own org subscriptions"
    ON subscriptions FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = (SELECT auth.uid())
        )
    );

-- Subscription expenses: Solo la organización propia
CREATE POLICY "Users can view own org expenses"
    ON subscription_expenses FOR SELECT
    USING (
        subscription_id IN (
            SELECT s.id FROM subscriptions s
            JOIN users u ON u.organization_id = s.organization_id
            WHERE u.id = (SELECT auth.uid())
        )
    );

-- Políticas RLS para invitaciones
CREATE POLICY "Admins can view and manage their organization invitations"
    ON organization_invitations
    FOR ALL
    USING (
        public.is_user_admin(auth.uid(), organization_id) = TRUE
    );

CREATE POLICY "Users can view invitations matching their email"
    ON organization_invitations
    FOR SELECT
    USING (
        email = (SELECT email FROM users WHERE id = auth.uid())
    );

-- Políticas RLS para solicitudes de acceso
CREATE POLICY "Admins can view and manage organization join requests"
    ON join_requests
    FOR ALL
    USING (
        public.is_user_admin(auth.uid(), organization_id) = TRUE
    );

CREATE POLICY "Users can view and manage their own join requests"
    ON join_requests
    FOR ALL
    USING (
        user_id = auth.uid()
    );

-- ══════════════════════════════════════════════════════════════
-- TRIGGER: Auto-crear perfil en users al registrarse via Auth
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.users (id, full_name, email, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Solo crear si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_new_user();
    END IF;
END;
$$;
