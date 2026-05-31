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

## [2026-05-22] Sesión 5: Limpieza de `org_type` y Resolución de Conexión de Base de Datos (Supavisor)
**Hora:** 20:20 (Local Time)  
**Objetivo:** Eliminar por completo el campo `org_type` a nivel de base de datos, código y lógica, resolver problemas de conexión a la base de datos de producción mediante `psql` (Supavisor) y solucionar fallos internos de resolución de DNS en la red de Docker.

### 1. Cambios en Código (Next.js & Cleanup)
- **Eliminación de `org_type`:**
  - Se removieron todas las referencias a `org_type` de las tablas, definiciones TypeScript, Server Actions de Onboarding, y datos mock de prueba.
  - Esto obedece a que el rol de una organización es inherente a su relación con el proyecto (ej: Cliente, Contratista, Dueño) y no una propiedad global de la organización.

### 2. Cambios en Base de Datos e Infraestructura (Docker / Supavisor)
- **Sincronización de Contraseñas:**
  - Ejecutada actualización de contraseñas mediante `ALTER ROLE` en Postgres para sincronizar los roles `postgres` y `supabase_admin` con la clave secreta definida en el entorno de Dokploy (`hy68ksij01rvo5nrychloqi6xrotgszx`).
- **Resolución de Red e Interrupciones de DNS:**
  - Configurada una red de puente virtual dedicada (`supabase-network`) en `docker-compose.yml` para aislar los contenedores de Supabase, resolviendo el bucle infinito de reinicios causados por el error `hostname: Temporary failure in name resolution`.
  - Asegurada la correcta comunicación de todos los contenedores de la pila en la nueva red.

### 3. Plan de Control e Integridad
- **Verificación de Conectividad:**
  - Probada la conexión por línea de comando externa `psql` usando el puerto `5432` de Supavisor de manera totalmente exitosa.
- **Compilación del Proyecto:**
  - Compilación del proyecto local verificada con éxito (`npm run build` completado con código de salida 0 y 0 errores).

## [2026-05-23] Sesión 6: Ciclo de Vida Documental, Configuración de Proyectos y Transmittals
**Hora:** 15:07 (Local Time)  
**Objetivo:** Desarrollar e integrar el ciclo de vida de los documentos, comentarios técnicos de revisión, edición de configuración de proyectos, y la creación y emisión de Transmittals formales con conversiones de versionado.

### 1. Cambios en Código (Next.js & Frontend)
- **Control de Revisiones en DocumentDrawer:**
  - Añadido soporte interactivo para subidas de archivos usando un almacenamiento abstracto agnóstico (`StorageService` y `LocalStorageService` mock).
  - Implementado panel y botones contextuales para cambiar estados internos (`DRAFT` -> `IN_REVIEW` -> `APPROVED` o `COMMENTED` con nivel `MINOR`/`MAJOR`).
  - Creada Server Action `createNextRevisionAction` para generar la siguiente revisión secuencial arrastrando automáticamente comentarios abiertos.
- **Línea de Tiempo y Comentarios:**
  - Habilitados enlaces directos para descarga de revisiones.
  - Implementadas respuestas y cierres/resoluciones de comentarios técnicos directamente en `RevisionTimeline`.
- **Configuración de Proyecto:**
  - Creado formulario cliente `SettingsForm` y Server Action `updateProjectSettingsAction` para modificar nombre, patrón de código, lógica de versionado (`MIXED` / `SEPARATE_EMISSION`) y flujo de revisión de proyectos.
- **Módulo de Transmittals:**
  - Creado el diálogo `CreateTransmittalDialog` para seleccionar organizaciones destinatarias, filtrar y marcar documentos aprobados (`APPROVED`), e ingresar el código de emisión.
  - Conectado el modal a la tabla principal `TransmittalTable` y el botón "Nuevo Envío".
  - Implementada la conversión de versión inmutable al emitir (`Rev A` a `Rev 0` en lógica `MIXED`, y tag manual en `SEPARATE_EMISSION`).

### 2. Cambios en Base de Datos
- Sincronizado `supabase/schema.sql` para reflejar las columnas añadidas en la migración `20260523_versioning_and_storage.sql` (`versioning_logic`, `review_flow_config` en `projects` y `emission_code`, `comment_level` en `revisions`).
- Aplicada y verificada la migración `migration_settings_org.sql` de forma directa en el contenedor de base de datos del VPS.

### 3. Plan de Control e Integridad
- **Prueba en Vivo (E2E):**
  - Ejecutada verificación completa usando `browser_subagent` logrando de manera exitosa inicio de sesión, creación de proyecto, creación de documento, carga de archivo PDF, cambio de estados, guardado de configuraciones y emisión formal del transmittal.
- **Compilación de Producción:**
  - Ejecutado `npm run build` finalizando con éxito total y 0 advertencias o errores.

## [2026-05-25] Sesión 7: Corrección de Onboarding, Solicitud y Aprobación de Acceso a Organizaciones
**Hora:** 03:20 (Local Time)  
**Objetivo:** Resolver los bugs críticos en los flujos de onboarding y solicitudes de acceso: redirección al registrarse con OTP pendiente, filtrar la lista de miembros en el onboarding para mostrar sólo administradores, corregir la visualización del nombre y correo en la sección de solicitudes del panel de administración, e implementar la acción de aprobación que vincula correctamente al nuevo usuario a la organización.

### 1. Cambios en Código (Next.js & Frontend)
- **Redirección de Registro y OTP:**
  - Modificada la acción de signup `signupAction` en `src/app/(auth)/login/actions.ts` para redirigir a `/register?email=...` tras registrar un usuario no verificado en Supabase.
  - Implementada la redirección automática a la vista de ingreso del código de verificación con un banner explicativo claro, evitando que el usuario se quede varado en la pantalla de registro.
- **Filtro de Privacidad en Onboarding:**
  - Modificado `src/app/onboarding/page.tsx` para obtener sólo los usuarios administradores (`is_admin: true`) de la organización que coincide con el dominio corporativo del usuario, ocultando otros colaboradores.
- **Visualización Completa del Solicitante en Panel Administrativo:**
  - Corregido el bug en la pestaña "Mi Organización" de `/settings` (`settings-client.tsx` y `page.tsx`). Ahora las solicitudes de acceso pendientes muestran la información de usuario unida (`users(full_name, email)`) en lugar de mostrar "Usuario" genérico.
- **Aprobación de Solicitudes y Redirección Bypass:**
  - Modificada la Server Action `handleJoinRequestAction` en `src/app/(dashboard)/settings/actions.ts` para asociar directamente el `organization_id` al usuario en la tabla `users` y cambiar el estado de la solicitud en `join_requests` a `APPROVED`.
  - Asegurada la revalidación de ruta y refresco del cliente para reflejar de inmediato al nuevo miembro en la lista.
  - El usuario aprobado ahora puede iniciar sesión e ingresar directamente al dashboard raíz `/`, ya que el sistema detecta su vinculación a la organización y omite la página de onboarding.

### 2. Cambios en Base de Datos e Integridad
- Ejecutado script de actualización de contraseñas de prueba en base de datos.
- Reseteado el estado de Ayrton Senna en la base de datos para pruebas limpias.

### 3. Plan de Control e Integridad
- **Prueba E2E Completa (Browser Subagent):**
  - Ejecutada prueba en vivo de punta a punta: Ayrton Senna se registra, ve el dominio coincidente (con Diego Moreno de administrador), solicita acceso, el administrador Diego Moreno inicia sesión, despliega la sección de solicitudes desplazándose verticalmente por la página, aprueba la solicitud, y Ayrton Senna ingresa directamente al dashboard sin redirección a onboarding.
- **Compilación de Producción:**
  - Compilado localmente con éxito total (`npm run build` completado exitosamente y con 0 errores).


## [2026-05-25] Sesión 8: Integración de Logo, Paleta de Colores de Marca y Corrección de Hidratación (Hydration Mismatch)
**Hora:** 22:43 (Local Time)  
**Objetivo:** Integrar el nuevo logotipo oficial en formato SVG a lo largo de toda la plataforma, adaptar los tokens globales de color en modo claro y oscuro, ajustar las plantillas HTML de correo transaccional a la identidad de la marca, y solucionar los fallos de hidratación de fechas localizadas.

### 1. Cambios en Código (Next.js & Styling)
- **Activos de Marca:**
  - Guardado el logotipo SVG en [[logo.svg](file:///home/diegogto/Documents/Projects/Faberdoc/public/logo.svg)].
  - Creado el componente React [[logo.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/components/ui/logo.tsx)] que contiene los paths en línea del logotipo e isotipo. Soporta `iconOnly` (que modifica el `viewBox` para mostrar solo los 3 folios cuando la barra lateral se colapsa) y clases responsivas de modo claro y oscuro.
  - Reemplazados los iconos de marca provisorios por el componente `<Logo />` en [[sidebar.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/components/layout/sidebar.tsx)] (escalado a 1.5x / `h-9` en expandido y `h-[33px]` en colapsado), [[login/page.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/(auth)/login/page.tsx)] (escalado a 2.0x / `h-20`), [[register/page.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/(auth)/register/page.tsx)] (escalado a 2.0x / `h-20`), y [[onboarding-client.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/onboarding/onboarding-client.tsx)] (escalado a 2.0x / `h-20`).
- **Paleta de Colores Global (globals.css):**
  - Modificado [[globals.css](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/globals.css)] para incorporar los colores corporativos oficiales:
    - *Modo Claro*: `--primary` ahora apunta al Faber Navy (`oklch(0.32 0.045 250)`), `--ring` al Doc Medium Blue (`oklch(0.48 0.10 250)`), y grises y fondos secundarios calculados para máxima sintonía.
    - *Modo Oscuro*: `--background` pasa a un navy-gris oscuro premium (`oklch(0.18 0.015 250)`) y `--primary` al Soft Steel Blue (`oklch(0.74 0.05 250)`) para legibilidad.
- **Plantillas de Correo (email-templates.ts):**
  - Modificado [[email-templates.ts](file:///home/diegogto/Documents/Projects/Faberdoc/src/lib/email-templates.ts)] para colorear los fallbacks de texto imitando la marca (`<span style="color: #2e3e56;">Faber</span><span style="color: #8e949d;">Doc</span>`), y asignado el color primario de marca `#2e3e56` a todos los botones y `#3e689a` a enlaces.
- **Corrección de Mismatch de Hidratación:**
  - El formateo de fechas localizadas (`es-CL`) a través de `.toLocaleDateString()` provocaba fallos de hidratación por el uso de caracteres de espacio estrechos no divisibles en el servidor frente a normales en cliente, y diferencias de zona horaria.
  - Normalizados los caracteres de espacio en `formatDate` en [[global-timeline.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/components/layout/global-timeline.tsx)].
  - Añadido `suppressHydrationWarning` en las etiquetas `<span>` contenedoras de fechas dinámicas en:
    - [[global-timeline.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/components/layout/global-timeline.tsx)]
    - [[transmittal-table.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/components/transmittals/transmittal-table.tsx)]
    - [[document-drawer.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/components/documents/document-drawer.tsx)]
    - [[document-columns.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/components/documents/document-columns.tsx)]
    - [[revision-timeline.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/components/documents/revision-timeline.tsx)]

### 2. Cambios en Base de Datos
- **Estado:** Sin modificaciones de esquema SQL en esta sesión.

### 3. Plan de Control e Integridad
- Actualizado [[guidelines.md](file:///home/diegogto/Documents/Projects/Faberdoc/.agents/rules/guidelines.md)] documentando el sistema de diseño basado en la paleta de colores del logo.
- Compilación del proyecto local verificada con éxito (`npm run build` finalizado exitosamente y con 0 errores).

## [2026-05-31] Sesión 9: Solución de Recuperación de Contraseña, Optimización de Logs, Feedback de Formulario y Soporte para Gestores de Contraseña
**Hora:** 11:10 (Local Time)  
**Objetivo:** Ignorar localmente la carpeta `.agents/`, corregir la verbosidad de logs de correo en consola, implementar feedback visual contra doble clic en la recuperación de contraseña, arreglar problemas de OTP/enlace expirados, corregir la redirección proxy en producción (0.0.0.0:3000), agregar el logotipo institucional a todas las vistas de recuperación de contraseña, e integrar soporte explícito de email para gestores de contraseñas.

### 1. Cambios en Código (Next.js & Frontend)
- **Localización de Carpeta .agents**:
  - Modificado [`.gitignore`](file:///home/diegogto/Documents/Projects/Faberdoc/.gitignore) agregando `.agents/`.
  - Ejecutado `git rm -r --cached .agents` para remover el directorio del repositorio en Git manteniendo los archivos intactos localmente.
- **Simplificación y Mejora de Logs de Email**:
  - Modificado [[email.ts](file:///home/diegogto/Documents/Projects/Faberdoc/src/lib/email.ts)] para omitir el volcado completo de HTML de los correos en la consola en modo desarrollo/MOCK.
  - Implementada extracción mediante regex para imprimir de manera limpia e intuitiva en la consola los enlaces de redirección detectados y el código OTP (temporal) de 6 dígitos.
  - Corregido bug del detector de código OTP: el regex original colisionaba con colores CSS hexadecimales (como el gris de texto `#334155`). Se implementó un lookbehind negativo de JavaScript `(?<!#)\b\d{6}\b` para ignorar los códigos de color hexadecimales y capturar únicamente el OTP real del usuario.
- **Feedback Visual y Prevención de Clics Múltiples**:
  - Creado el componente de cliente [[forgot-password-client.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/(auth)/forgot-password/forgot-password-client.tsx)] para gestionar el envío usando `useTransition`.
  - Modificado [[page.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/(auth)/forgot-password/page.tsx)] para utilizar este nuevo formulario de cliente. El botón "Enviar enlace" ahora muestra un spinner y el texto "Enviando..." y se deshabilita instantáneamente, evitando clics duplicados del usuario que invaliden los OTP en Supabase.
- **Soporte para Gestores de Contraseñas**:
  - En [[reset-password-client.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/(auth)/reset-password/reset-password-client.tsx)] y [[page.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/(auth)/reset-password/page.tsx)], se incorporó una prop para pasar el email del usuario desde el Server Component al Client Component.
  - Añadido un campo visible de solo lectura con `name="email"` y `autoComplete="username"` que muestra explícitamente el email del usuario.
  - Añadido `autoComplete="new-password"` a los campos de contraseña y confirmación de contraseña, permitiendo a gestores de contraseñas (1Password, Bitwarden, Chrome Autofill, etc.) asociar y guardar las credenciales actualizadas de forma transparente.
- **Identidad de Marca**:
  - Se importó y renderizó el componente de marca `<Logo className="h-20 w-auto" />` en lugar de los iconos de carpeta genéricos en las páginas [[forgot-password/page.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/(auth)/forgot-password/page.tsx)], [[forgot-password/verify/page.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/(auth)/forgot-password/verify/page.tsx)], y [[reset-password/page.tsx](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/(auth)/reset-password/page.tsx)].

### 2. Cambios en Base de Datos e Infraestructura
- **Redirección de Origen de Red en Producción**:
  - En la ruta de redirección [[route.ts](file:///home/diegogto/Documents/Projects/Faberdoc/src/app/auth/confirm/route.ts)] se restableció la invocación de `getRequestOrigin()`.
  - En [[server.ts](file:///home/diegogto/Documents/Projects/Faberdoc/src/lib/supabase/server.ts)], se actualizó la función `getRequestOrigin()` para detectar si estamos en desarrollo (`process.env.NODE_ENV === "development"`). De ser así, se ignora la cabecera `x-forwarded-host` de los proxys y se retorna `http://${host}`, garantizando que las pruebas en local permanezcan en `localhost:3000`. En producción (VPS), continúa leyendo `x-forwarded-host` para resolver correctamente `https://faberdoc.com` en lugar de la IP interna del contenedor (`0.0.0.0:3000`).

### 3. Plan de Control e Integridad
- Compilación del proyecto local verificada con éxito (`npm run build` finalizado exitosamente y con 0 errores).

