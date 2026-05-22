# Faberdoc - Registro de Sesiones (Sessions Log)

## [2026-05-18] Sesión 1: Resolución de Enrutamiento, Diagnóstico de Auth y Corrección de UI
**Hora:** 19:50 (Local Time)  
**Objetivo:** Resolver el error 404 en la página raíz, diagnosticar el error en la creación de cuentas de Supabase Auth, solucionar el bloqueo al hacer clic en el avatar del usuario, e inicializar el sistema de control de tareas (`todo.md`).

### 1. Cambios en Código e Infraestructura (Next.js)
- **Resolución de Error 404:**
  - Identificación del conflicto de rutas entre `src/app/page.tsx` y `src/app/(dashboard)/page.tsx`.
  - Eliminación de `src/app/page.tsx` que redirigía erróneamente a `/dashboard` (provocando un 404 ya que la ruta no existía en el grupo).
  - La raíz `/` ahora es manejada limpiamente por la estructura de layout y página bajo `(dashboard)`.
- **Monitoreo de Autenticación:**
  - Modificación de [[actions.ts](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/(auth)/login/actions.ts)] para registrar en consola (`console.error`) los errores reales de login y signup de Supabase en el servidor.
  - Diagnóstico exitoso de un error `502 Bad Gateway` (`AuthRetryableFetchError`) de 19 segundos en local: se identificó como el timeout por defecto de confirmación de email (SMTP no configurado en la instancia de Supabase en Dokploy).
- **Corrección de Runtime Crash en UI (Dropdown):**
  - Redefinición de `DropdownMenuLabel` en [[dropdown-menu.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/components/ui/dropdown-menu.tsx)] como un componente `div` estándar de HTML.
  - Esto evita la restricción estricta de Base UI que lanzaba la excepción `Base UI: MenuGroupRootContext is missing. Menu group parts must be used within <Menu.Group>` al hacer clic en el avatar del usuario.

### 2. Cambios en Base de Datos (Supabase)
- **Estado:** Sin modificaciones de esquema SQL en esta sesión. El archivo [[001_initial_schema.sql](file:///home/diegogto/Documents/Projects/Faberdoc/supabase/migrations/001_initial_schema.sql)] se mantiene intacto.

### 3. Plan de Control e Integridad
- Creado archivo [[todo.md](file:///home/diegogto/Documents/Projects/Faberdoc/todo.md)] para seguimiento continuo de tareas utilizando el sistema de control atómico del proyecto.
- Compilación del proyecto local verificada con éxito (`npm run build` finalizado con éxito en 7.9 segundos y código de salida 0).

## [2026-05-19] Sesión 2: Flujo de Onboarding Completo, Prevención de Duplicados Corporativos e Integración de Admin Client
**Hora:** 21:30 (Local Time)  
**Objetivo:** Diseñar e implementar el flujo de onboarding que intercepte a usuarios sin organización, prevenga la creación de organizaciones corporativas duplicadas evaluando el dominio del correo electrónico, y provisione una suscripción gratuita inicial (`FREE`).

### 1. Cambios en Código (Next.js & Supabase integration)
- **Interceptación y Redirección en Dashboard Layout:**
  - Modificado el Layout Global `src/app/(dashboard)/layout.tsx` para forzar la redirección a `/onboarding` a cualquier usuario con sesión iniciada cuyo `organization_id` en el perfil de usuario sea `null`. Esto encapsula las rutas del dashboard de forma segura.
- **Helper de Cliente Administrativo (Service Role):**
  - Creado [[admin.ts](file:///home/diegogto/Documents/Projects/Faberdoc/src/lib/supabase/admin.ts)] para inicializar un cliente de Supabase usando la variable de entorno de alta seguridad `SUPABASE_SERVICE_ROLE_KEY`. Esto nos permite realizar escrituras de sistema (como insertar en `organizations` y `subscriptions`) saltándonos de forma segura las restricciones de RLS a nivel de cliente.
- **Server Actions de Onboarding y Cierre de Sesión:**
  - Creado [[actions.ts](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/onboarding/actions.ts)]:
    - Contiene el helper `getCorporateDomain` (asíncrono para satisfacer los requerimientos de Next.js Server Actions) que descarta dominios públicos (gmail, yahoo, etc.) y extrae dominios corporativos.
    - Implementa `completeOnboardingAction` para validar el nombre con **Zod**, insertar la organización, actualizar `users.organization_id` y crear la suscripción inicial `FREE` activa para un año.
    - Implementa `logoutAction` para poder cerrar sesión limpia en cualquier momento del proceso.
- **Interfaz Premium de Onboarding:**
  - Creado el Server Component [[page.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/onboarding/page.tsx)] que realiza validaciones iniciales de perfil y comprueba si ya existe una organización registrada con el dominio de correo del usuario actual.
  - Creado el Client Component [[onboarding-client.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/onboarding/onboarding-client.tsx)] para desplegar una interfaz premium, glassmorphic e interactiva con dos flujos:
    - **Pantalla de Advertencia:** Si se detecta un duplicado, advierte al usuario, lista hasta 5 miembros administradores de esa organización para contactarles y ofrece un bypass explícito ("Crear organización separada") mediante un parámetro query `/onboarding?bypass=true`.
    - **Pantalla de Creación estándar:** Formulario de un solo campo para registrar la nueva organización con indicadores de carga y mensajes de error.
  - **Rediseño Estético de Consistencia:** Modificado [[onboarding-client.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/onboarding/onboarding-client.tsx)] para usar el sistema visual de la app: eliminando el fondo de luces violetas personalizadas por el fondo global `bg-background`, bordes `border-border`, fuentes y inputs estándar, y el logo `FolderKanban` consistente con el Login/Register.
- **División de Páginas de Login y Registro:**
  - Rediseñado [[login/page.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/(auth)/login/page.tsx)] para que sea un formulario estrictamente dedicado a iniciar sesión (con inputs de Email y Contraseña únicamente, omitiendo el nombre completo), y con un enlace claro a la página de registro.
  - Creado el directorio [[register](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/(auth)/register)] y su página [[page.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/(auth)/register/page.tsx)] dedicada a registro/signup (incluyendo inputs de Nombre Completo, Email y Contraseña), conectando con la Server Action `signupAction` y un enlace de retorno a iniciar sesión.
  - Modificado [[actions.ts](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/(auth)/login/actions.ts)] para que redirija los errores de registro a `/register?error=signup`.

### 2. Cambios en Base de Datos (Supabase)
- **Sincronización en `schema.sql`:**
  - Modificado [[schema.sql](file:///home/diegogto/Documents/Projects/Faberdoc/supabase/schema.sql)] para remover la columna `org_type` de `organizations` (de acuerdo con las directrices del usuario), añadir el campo `email_domain VARCHAR(255)` e indexar la búsqueda de dominios corporativos con `idx_organizations_email_domain`.

### 3. Plan de Control e Integridad
- Actualizado [[todo.md](file:///home/diegogto/Documents/Projects/Faberdoc/todo.md)] marcando los flujos correspondientes como finalizados.
- Compilación del proyecto local verificada con éxito total (`npm run build` completado exitosamente en Next.js Turbopack con código de salida 0 y 0 errores).

## [2026-05-20] Sesión 3: Master Document List (MDL), Nomenclatura Dinámica e Importación CSV
**Hora:** 02:00 (Local Time)  
**Objetivo:** Desarrollar la interfaz y la lógica de negocio del Master Document List (MDL). Implementar creación unitaria de documentos, importación masiva mediante CSV con mapeo interactivo de columnas, filtro dinámico y control de visibilidad de columnas, integrando con Supabase y validaciones RLS.

### 1. Cambios en Código (Next.js & Supabase integration)
- **Server Actions del MDL (`src/app/(dashboard)/projects/[projectId]/mdl/actions.ts`):**
  - Implementado `createDocumentAction` para validar datos mediante **Zod**, resolver correlativos de nomenclatura y crear un documento junto a su revisión inicial (`DRAFT` sin archivos) y su primer log de emisión.
  - Implementado `bulkImportDocumentsAction` para insertar lotes de documentos creados de forma masiva en transacciones.
  - Implementada verificación de permisos basada en roles (`ADMIN`, `REVIEWER`, `OWNER_APPROVER`).
- **Página Principal del MDL (`src/app/(dashboard)/projects/[projectId]/mdl/page.tsx`):**
  - Carga en paralelo del proyecto, sus custom properties y su patrón de nomenclatura.
  - Consulta en Supabase aplanando metadatos para TanStack Table y formateando fechas en formato local.
  - Gestión correcta del estado de documentos sin archivos, mostrando `—` en revisión y estado.
- **Componentes del MDL (`src/components/documents/`):**
  - [[document-columns.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/components/documents/document-columns.tsx)]: Columnas dinámicas generadas en tiempo de ejecución.
  - [[document-create-dialog.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/components/documents/document-create-dialog.tsx)]: Asistente de creación unitaria con previsualización en vivo del Naming Engine.
  - [[document-import-dialog.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/components/documents/document-import-dialog.tsx)]: Asistente de importación por pasos de CSV con selector de cabeceras, previsualización y mapeador interactivo de columnas a campos Faberdoc.
  - [[document-toolbar.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/components/documents/document-toolbar.tsx)]: Barra de herramientas con filtros dinámicos por propiedades personalizadas tipo *select* y buscador textual.
  - [[document-table.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/components/documents/document-table.tsx)]: Componente contenedor de TanStack Table que integra controles de visibilidad, filtros y modales.

### 2. Cambios en Base de Datos (Supabase)
- Sincronizado esquema de base de datos en [[schema.sql](file:///home/diegogto/Documents/Projects/Faberdoc/supabase/schema.sql)] para el correcto funcionamiento del MDL, perfiles y políticas RLS.

### 3. Plan de Control e Integridad
- Actualizado [[todo.md](file:///home/diegogto/Documents/Projects/Faberdoc/todo.md)] marcando los entregables de MDL y Naming Engine como completados.
- Verificado que el proyecto compila limpiamente (`npm run build` sin errores de tipos ni warnings).
- Ejecutado flujo de prueba extremo usando el browser para validar onboarding, creación del primer documento con código `PLAN-CIV-100-001` y visibilidad de columnas en vivo.

## [2026-05-22] Sesión 4: Restablecimiento de Contraseña, Panel de Perfil y Organización, y Onboarding Adaptativo
**Hora:** 14:00 (Local Time)  
**Objetivo:** Desarrollar el flujo completo de olvido y cambio de contraseña, el panel de control de perfil y administración de la organización (incluyendo asignación de roles, expulsión, invitaciones de email y solicitudes de acceso), e implementar el flujo adaptativo en el onboarding.

### 1. Cambios en Código (Next.js & Supabase integration)
- **Recuperación de Contraseña:**
  - Creadas las páginas [[forgot-password/page.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/(auth)/forgot-password/page.tsx)] y [[reset-password/page.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/(auth)/reset-password/page.tsx)] para solicitar y confirmar el cambio de contraseña.
  - Creado el Route Handler [[route.ts](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/auth/callback/route.ts)] para gestionar el intercambio de códigos de autenticación (`code`), resolviendo de forma segura la redirección pública detrás de proxies inversos VPS (`x-forwarded-host`).
  - Añadidas las Server Actions `requestResetPasswordAction` y `resetPasswordAction` en [[actions.ts](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/(auth)/login/actions.ts)].
- **Panel de Configuración y Gestión de Organización (`/settings`):**
  - Creadas las Server Actions en [[actions.ts](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/(dashboard)/settings/actions.ts)] (validadas con **Zod**) para actualizar perfil, contraseña, invitar nuevos usuarios, cambiar roles (`is_admin`), remover usuarios y procesar solicitudes de acceso (`join_requests`).
  - Creada la página principal [[page.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/(dashboard)/settings/page.tsx)] y el componente interactivo [[settings-client.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/(dashboard)/settings/settings-client.tsx)] estructurado con pestañas para "Mi Perfil" (nombre/contraseña) y "Mi Organización":
    - Los administradores pueden gestionar activamente a los miembros, cambiar roles, expulsar usuarios, invitar nuevos colaboradores (utilizando la integración SMTP con **Resend**) y aprobar/rechazar solicitudes de acceso.
    - Los colaboradores normales disponen de una vista de solo lectura de los miembros.
  - Integrada la entrega de emails transaccionales a través del wrapper [[email.ts](file:///home/diegogto/Documents/Projects/Faberdoc/src/lib/email.ts)] que se comunica directamente con la API REST de Resend de forma liviana y segura.
- **Onboarding Adaptativo:**
  - Modificado [[page.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/onboarding/page.tsx)] y [[onboarding-client.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/onboarding/onboarding-client.tsx)] para verificar solicitudes de acceso y/o invitaciones pendientes del usuario:
    - *Invitación pendiente*: Permite unirse directamente a la organización asociada.
    - *Solicitud pendiente*: Informa del estado de espera de aprobación.
    - *Dominio Duplicado*: Permite enviar una solicitud de acceso interactiva al administrador de la empresa.
  - Modificado [[actions.ts](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/onboarding/actions.ts)] con Server Actions para aceptar invitaciones, solicitar acceso y cancelar solicitudes.

### 2. Cambios en Base de Datos (Supabase)
- Creada la migración [[migration_settings_org.sql](file:///home/diegogto/Documents/Projects/Faberdoc/supabase/migration_settings_org.sql)] (registrada en `schema.sql`) agregando la columna `email` a `users`, creando las tablas `organization_invitations` y `join_requests`, y definiendo las políticas de seguridad RLS asociadas.

### 3. Plan de Control e Integridad
- Modificado [[user-nav.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/components/layout/user-nav.tsx)] para solucionar errores de tipado con `DropdownMenuItem` removiendo `asChild` innecesarios.
- Compilación del proyecto local verificada con éxito total (`npm run build` completado con código de salida 0 en Next.js Turbopack y 0 errores).
