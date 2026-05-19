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
