-- Migración: Permitir a los miembros y administradores de la organización ver los detalles de los solicitantes de acceso (join_requests)
-- Antes de esta política, el admin solo veía "usuario" genérico porque el solicitante no formaba parte de la organización (organization_id era NULL).

DROP POLICY IF EXISTS "Users can view members of their organization" ON public.users;

CREATE POLICY "Users can view members of their organization or join requesters"
    ON public.users FOR SELECT
    USING (
        id = auth.uid()
        OR organization_id = public.get_user_org(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.join_requests jr
            WHERE jr.user_id = users.id 
              AND jr.organization_id = public.get_user_org(auth.uid())
        )
    );
