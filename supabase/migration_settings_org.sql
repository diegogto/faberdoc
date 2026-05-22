-- 1. Añadir columna email a users y poblar con datos existentes
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Actualizar registros existentes desde auth.users (si hay alguno)
UPDATE public.users u
SET email = a.email
FROM auth.users a
WHERE u.id = a.id AND u.email IS NULL;

-- 2. Modificar la función trigger para incluir el email
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

-- 3. Crear tabla de invitaciones de la organización
CREATE TABLE IF NOT EXISTS public.organization_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    email VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, email)
);

-- 4. Crear tabla de solicitudes de acceso
CREATE TABLE IF NOT EXISTS public.join_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- 5. Crear función auxiliar segura para obtener la organización del usuario sin causar recursión
CREATE OR REPLACE FUNCTION public.get_user_org(user_uuid UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
    SELECT organization_id FROM public.users WHERE id = user_uuid;
$$;

-- 6. Actualizar políticas RLS de la tabla users para permitir visualización mutua en la organización
DROP POLICY IF EXISTS "Users can view project teammates" ON public.users;
DROP POLICY IF EXISTS "Users can view members of their organization" ON public.users;

CREATE POLICY "Users can view members of their organization"
    ON public.users FOR SELECT
    USING (
        id = auth.uid()
        OR organization_id = public.get_user_org(auth.uid())
    );

-- Políticas RLS para invitaciones
DROP POLICY IF EXISTS "Admins can view and manage their organization invitations" ON public.organization_invitations;
CREATE POLICY "Admins can view and manage their organization invitations"
    ON public.organization_invitations
    FOR ALL
    USING (
        public.is_user_admin(auth.uid(), organization_id) = TRUE
    );

DROP POLICY IF EXISTS "Users can view invitations matching their email" ON public.organization_invitations;
CREATE POLICY "Users can view invitations matching their email"
    ON public.organization_invitations
    FOR SELECT
    USING (
        email = (SELECT email FROM public.users WHERE id = auth.uid())
    );

-- Políticas RLS para solicitudes de acceso
DROP POLICY IF EXISTS "Admins can view and manage organization join requests" ON public.join_requests;
CREATE POLICY "Admins can view and manage organization join requests"
    ON public.join_requests
    FOR ALL
    USING (
        public.is_user_admin(auth.uid(), organization_id) = TRUE
    );

DROP POLICY IF EXISTS "Users can view and manage their own join requests" ON public.join_requests;
CREATE POLICY "Users can view and manage their own join requests"
    ON public.join_requests
    FOR ALL
    USING (
        user_id = auth.uid()
    );
