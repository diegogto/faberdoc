-- ══════════════════════════════════════════════════════════════
-- Faberdoc — Migration: Organization Logo & COORDINATOR Role
-- ══════════════════════════════════════════════════════════════

-- Agregar columna logo_url a la tabla organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Modificar restricción de rol en project_members para incluir COORDINATOR
ALTER TABLE public.project_members DROP CONSTRAINT IF EXISTS project_members_role_check;
ALTER TABLE public.project_members ADD CONSTRAINT project_members_role_check 
CHECK (role IN ('ADMIN', 'COORDINATOR', 'REVIEWER', 'OWNER_APPROVER', 'VIEWER'));
