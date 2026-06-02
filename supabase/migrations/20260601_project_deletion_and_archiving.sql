-- Add archived_at column to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Recreate foreign key constraints with ON DELETE CASCADE to allow project deletion cleanup
-- 1. documents table (referencing projects)
ALTER TABLE public.documents
DROP CONSTRAINT IF EXISTS documents_project_id_fkey,
ADD CONSTRAINT documents_project_id_fkey
  FOREIGN KEY (project_id)
  REFERENCES public.projects(id)
  ON DELETE CASCADE;

-- 2. transmittals table (referencing projects)
ALTER TABLE public.transmittals
DROP CONSTRAINT IF EXISTS transmittals_project_id_fkey,
ADD CONSTRAINT transmittals_project_id_fkey
  FOREIGN KEY (project_id)
  REFERENCES public.projects(id)
  ON DELETE CASCADE;

-- 3. transmittal_items table (referencing revisions)
ALTER TABLE public.transmittal_items
DROP CONSTRAINT IF EXISTS transmittal_items_revision_id_fkey,
ADD CONSTRAINT transmittal_items_revision_id_fkey
  FOREIGN KEY (revision_id)
  REFERENCES public.revisions(id)
  ON DELETE CASCADE;

-- 4. Update Projects SELECT policy to allow Org Admins to see soft-deleted projects
DROP POLICY IF EXISTS "Users can view their projects" ON public.projects;
CREATE POLICY "Users can view their projects"
  ON public.projects FOR SELECT
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

