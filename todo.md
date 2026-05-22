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

## III. Panel de Control y Proyectos
- [ ] Dashboard Principal de Usuario (resumen de tareas pendientes, últimas emisiones)
- [ ] Módulo de Proyectos: Creación, asignación de miembros (`project_members`) y roles (ADMIN, REVIEWER, etc.)
- [x] Configuración del Naming Engine (patrón dinámico como `{PROY}-{ESP}-{NUM}`)

## IV. Master Delivery List (MDL)
- [x] Tabla principal interactiva (TanStack Table v8 + TanStack Query)
- [x] Filtros avanzados y ordenamiento por metadatos dinámicos
- [x] Carga masiva de MDL mediante importación (CSV/Excel)
- [x] Panel lateral (Sheet/Drawer) para inspeccionar metadatos y línea de tiempo de revisiones sin perder contexto

## V. Control de Revisiones y Almacenamiento
- [ ] Carga de archivos a Supabase Storage con subida directa y segura
- [ ] Generación de URLs firmadas (Presigned URLs) con expiración corta para descarga
- [ ] Lógica de versionamiento dinámico (`version_index` y `version_label`)

## VI. Registro de Emisiones y Transmittals
- [ ] Emisiones Formales (Transmittals) y asociación inmutable a revisiones
- [ ] Control de fechas estimadas vs reales en `issuance_logs` (reprogramaciones automáticas)
- [ ] Importación y extracción de comentarios formales de revisión sobre PDF
- [ ] Lógica de arrastre de comentarios abiertos (`OPEN`) a la siguiente revisión

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

## IX. Plantillas de Correo e Imagen de Marca
- [ ] Diseñar formatos HTML atractivos y profesionales para los correos (registro de usuario, invitaciones de equipo, recuperación de contraseña, etc.)
