-- ══════════════════════════════════════════════════════════════
-- Faberdoc — Migration: Versioning Logic, Flow and Comment Levels
-- ══════════════════════════════════════════════════════════════

-- Agregar tipo de lógica de versionamiento y flujo a proyectos
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS versioning_logic VARCHAR(50) DEFAULT 'MIXED' 
CHECK (versioning_logic IN ('MIXED', 'SEPARATE_EMISSION')),
ADD COLUMN IF NOT EXISTS review_flow_config JSONB DEFAULT '{}'::JSONB;

-- Actualizar restricción de estado de revisiones y agregar columnas adicionales
ALTER TABLE public.revisions DROP CONSTRAINT IF EXISTS revisions_status_check;
ALTER TABLE public.revisions ADD CONSTRAINT revisions_status_check 
CHECK (status IN ('DRAFT', 'IN_REVIEW', 'COMMENTED', 'APPROVED', 'ISSUED'));

ALTER TABLE public.revisions 
ADD COLUMN IF NOT EXISTS emission_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS comment_level VARCHAR(20) CHECK (comment_level IN ('MINOR', 'MAJOR'));
