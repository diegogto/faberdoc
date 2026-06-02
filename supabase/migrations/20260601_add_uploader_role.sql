-- Migration: Add UPLOADER role to project_members
-- Ejecutar en Supabase SQL Editor para actualizar la base de datos activa

-- 1. Eliminar la restricción de check de rol anterior
ALTER TABLE public.project_members DROP CONSTRAINT IF EXISTS project_members_role_check;

-- 2. Agregar la nueva restricción con 'UPLOADER' incluido
ALTER TABLE public.project_members ADD CONSTRAINT project_members_role_check 
    CHECK (role IN ('ADMIN', 'COORDINATOR', 'REVIEWER', 'OWNER_APPROVER', 'VIEWER', 'UPLOADER'));
