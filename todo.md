# Faberdoc - Lista de Pendientes (TODO)

## I. Infraestructura y Configuración
- [x] Configuración de Docker para desplegar Next.js standalone en Dokploy (Puerto 3000)
- [x] Configuración e inyección de variables de entorno build-time de Supabase en Dokploy
- [x] Configuración de comunicación local / remota con la API de Supabase

## II. Autenticación y Onboarding
- [x] Corrección de redirección y resolución de colisión de ruta raíz (`/`)
- [x] Implementación de logs para diagnóstico de Supabase Auth en Server Actions (error 502/SMTP)
- [x] Corrección de error de contexto en `DropdownMenuLabel` (Base UI compatibility)
- [x] Onboarding completo: Registro -> Creación de organización (`organizations`) -> Asignación de rol (con prevención de duplicados corporativos por dominio y bypass de sucursal)
- [x] Control de Suscripción en Onboarding (crear registro en `subscriptions` con plan default 'FREE')
- [x] BUG: Al registrar un nuevo usuario, sólo se muestra el aviso de revisar el correo pero no se redirige automáticamente a la página para ingresar el código OTP. Debería redirigir a la vista de confirmación informando que se envió un código o puede seguir el link del correo.
- [x] MEJORA: En el flujo de onboarding de un nuevo miembro para una organización existente (por coincidencia de dominio), sólo se deben listar los usuarios administradores (ADMIN) de dicha organización para solicitarles acceso.

## III. Panel de Control y Proyectos
- [x] Dashboard Principal de Usuario (resumen de tareas pendientes, últimas emisiones)
- [x] Módulo de Proyectos: Creación, asignación de miembros (`project_members`) y roles (ADMIN, REVIEWER, etc.)
- [x] Configuración del Naming Engine (patrón dinámico como `{PROY}-{ESP}-{NUM}`)
- [x] Optimizar la vista de configuración de un proyecto (hacerla más amigable, explicativa y dinámica)
  - [x] Rediseñar el configurador de código de documento (Naming Engine) para evitar el ingreso manual de brackets (`{...}`) mediante una interfaz visual con chips o constructores de patrones interactivos

## IV. Master Delivery List (MDL)
- [x] Tabla principal interactiva (TanStack Table v8 + TanStack Query)
- [x] Filtros avanzados y ordenamiento por metadatos dinámicos
- [x] Carga masiva de MDL mediante importación (CSV/Excel)
- [x] Panel lateral (Sheet/Drawer) para inspeccionar metadatos y línea de tiempo de revisiones sin perder contexto
- [x] Habilitar la modificación del ancho del sidebar (panel lateral/Sheet) del documento

## V. Control de Revisiones y Almacenamiento
- [ ] Carga de archivos a Supabase Storage con subida directa y segura
- [x] Generación de URLs firmadas (Presigned URLs) con expiración corta para descarga
- [x] Lógica de versionamiento dinámico (`version_index` y `version_label`)

## VI. Registro de Emisiones y Transmittals
- [x] Emisiones Formales (Transmittals) y asociación inmutable a revisiones
- [ ] Control de fechas estimadas vs reales en `issuance_logs` (reprogramaciones automáticas)
- [ ] Importación y extracción de comentarios formales de revisión sobre PDF
- [x] Lógica de arrastre de comentarios abiertos (`OPEN`) a la siguiente revisión

## VII. Monetización y Límites (Monetization Backbone)
- [ ] Validación de límites de proyectos activos y espacio en disco en base de datos/backend
- [ ] Bloqueo de operaciones de escritura (modo Read-Only) si la suscripción pasa a `PAST_DUE`
- [ ] Historial financiero: inserción de cobros exitosos o fallidos en `subscription_expenses`

## VIII. Perfil de Usuario y Recuperación
- [x] Panel de control de usuario (`/settings`) para modificar el nombre
- [x] Cambio de contraseña seguro para usuarios autenticados desde configuración
- [x] Flujo de recuperación de contraseña perdida (`/forgot-password` y `/reset-password`) con opción de enlace y código OTP
- [x] Integración de Resend SMTP para envío de correos transaccionales (invitaciones y recuperación)
- [x] Gestión organizativa en `/settings` (miembros, roles, invitaciones y solicitudes de acceso)
- [x] Onboarding adaptativo con flujos de unirse por invitación, solicitar acceso o bypass de dominio
- [x] BUG: Cuando un usuario solicita ser agregado a la organización, en la sección de solicitudes de acceso del panel del administrador sólo aparece "usuario" genérico sin detalles adicionales (como nombre o correo electrónico).
- [x] BUG: Cuando el administrador acepta una solicitud de acceso, la acción no tiene efecto (el usuario aceptado no se incorpora ni aparece en la lista de miembros de la organización).

## IX. Plantillas de Correo e Imagen de Marca
- [x] Diseñar formatos HTML atractivos y profesionales para los correos (registro de usuario, invitaciones de equipo, recuperación de contraseña, etc.)
- [x] Integrar el logotipo corporativo FaberDoc en formato SVG y su paleta de colores oficial (Faber Navy, Doc Medium Blue, Soft Steel Blue) en todas las vistas del sistema (sidebar, login, registro, onboarding y correos).
- [x] Resolver el bug de hidratación (Hydration Mismatch) en fechas localizadas.

## X. Backlog (Futuras Mejoras & Características Premium)
- [x] Línea de tiempo (Timeline) global: Vista general en pantalla principal para el historial de actividad y trazabilidad de documentos (en lugar del drawer)
- [ ] Time Tracker (Premium): Registro de tiempos de trabajo por documento (elaboración, revisión, etc.)

