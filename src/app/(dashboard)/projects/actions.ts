"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z
    .string()
    .min(3, "El nombre del proyecto debe tener al menos 3 caracteres")
    .max(100, "El nombre del proyecto no puede superar los 100 caracteres")
    .trim(),
});

export async function createProjectAction(formData: FormData) {
  const supabase = await createClient();

  // 1. Verificar autenticación
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return { error: "No estás autenticado." };
  }

  // 2. Validar campos
  const rawName = formData.get("name") as string;
  const validation = createProjectSchema.safeParse({ name: rawName });

  if (!validation.success) {
    return {
      error: validation.error.flatten().fieldErrors.name?.[0] || "Nombre inválido.",
    };
  }

  const { name } = validation.data;

  try {
    // 3. Obtener el perfil del usuario para validar la organización y permisos
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("organization_id, is_admin")
      .eq("id", authUser.id)
      .single();

    if (profileError || !userProfile) {
      console.error("Error al obtener perfil de usuario:", profileError);
      return { error: "No se pudo validar tu perfil de usuario." };
    }

    if (!userProfile.is_admin) {
      return { error: "Solo los administradores de la organización pueden crear proyectos." };
    }

    // 4. Definir propiedades personalizadas por defecto para un nuevo proyecto (estilo Notion/MDL)
    const defaultProperties = [
      {
        key: "specialty",
        label: "Especialidad",
        type: "select",
        options: ["Estructura", "Civil", "Mecánica", "Electricidad", "Instrumentación", "Procesos"],
      },
      {
        key: "area",
        label: "Área",
        type: "text",
      },
    ];

    // 5. Insertar proyecto en la base de datos (se aplica RLS de inserción)
    const { data: newProject, error: projectError } = await supabase
      .from("projects")
      .insert({
        name,
        organization_id: userProfile.organization_id,
        naming_pattern: "{PROY}-{ESP}-{NUM}",
        custom_properties_definition: defaultProperties,
      } as any)
      .select("id")
      .single();

    if (projectError || !newProject) {
      console.error("Error al insertar proyecto:", projectError);
      return { error: `No se pudo crear el proyecto. Detalle: ${projectError.message}` };
    }

    const projectId = newProject.id;

    // 6. Asignar automáticamente al creador (admin) como miembro del proyecto con rol ADMIN
    const { error: memberError } = await supabase
      .from("project_members")
      .insert({
        project_id: projectId,
        user_id: authUser.id,
        role: "ADMIN",
      });

    if (memberError) {
      console.error("Error al asignar membresía al proyecto:", memberError);
      return { error: `Proyecto creado, pero falló la membresía. Detalle: ${memberError.message}` };
    }

    // 7. Revalidar el path para refrescar Sidebar
    revalidatePath("/", "layout");

    return { success: true, projectId };
  } catch (err) {
    console.error("Excepción en creación de proyecto:", err);
    return { error: "Ocurrió un error inesperado al crear el proyecto." };
  }
}
