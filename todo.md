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
- [x] Completar y reordenar pantalla de configuración del proyecto:
  - [x] Información del proyecto: nombre, descripción, ubicación, cliente, etc.
  - [x] Configuración detallada de nomenclatura (separar código interno de documento vs código emitido con versión/emisión)
  - [x] Configurar formatos de versión/emisión (especificar para MIXED y SEPARATE_EMISSION)
  - [x] Finalizar el configurador del flujo de revisión y revisiones
  - [x] Mejorar la sección para administrar miembros del proyecto (roles, adición, eliminación)
- [x] Implementar opción de archivar proyecto (modo solo lectura para todos, descargas de versiones anteriores bloqueadas para usuarios comunes y habilitadas para Org Admins/Coordinadores mediante enlace seguro).
- [x] Implementar opción de eliminar proyectos y planos/documentos individuales (con papelera interactiva de 30 días con pestañas independientes, restauración rápida, y purga física de archivos asociados en storage y base de datos en cascada).


## IV. Master Delivery List (MDL)
- [x] Tabla principal interactiva (TanStack Table v8 + TanStack Query)
- [x] Filtros avanzados y ordenamiento por metadatos dinámicos
- [x] Carga masiva de MDL mediante importación (CSV/Excel)
- [x] Panel lateral (Sheet/Drawer) para inspeccionar metadatos y línea de tiempo de revisiones sin perder contexto
- [x] Habilitar la modificación del ancho del sidebar (panel lateral/Sheet) del documento
- [ ] Reflejar en la vista del documento/revisión el flujo de revisión definido en los diagramas de flujos del proyecto.
- [ ] Permitir al usuario seleccionar manualmente un flujo de revisión diferente para un documento/revisión si así lo requiere (si bien existirá un flujo automático en función de los atributos del documento, el usuario podrá anularlo y seleccionar uno diferente en este caso).


## V. Control de Revisiones y Almacenamiento
- [x] Carga de archivos a Supabase Storage con subida directa y segura
- [x] Generación de URLs firmadas (Presigned URLs) con expiración corta para descarga
- [x] Lógica de versionamiento dinámico (`version_index` y `version_label`)

## VI. Registro de Emisiones y Transmittals
- [x] Emisiones Formales (Transmittals) y asociación inmutable a revisiones
- [x] Control de fechas estimadas vs reales en `issuance_logs` (reprogramaciones automáticas)
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
- [x] BUG: Corrección de colisión de regex en el log del servidor (se capturaba el color CSS hexadecimal `#334155` como el código OTP).
- [x] BUG: Corrección de redirección rota en el callback `/auth/confirm` en producción detrás de proxies inversos (redireccionaba a `https://0.0.0.0:3000`).
- [x] MEJORA: Evitar reenvíos múltiples de recuperación (doble clic) en `/forgot-password` usando `useTransition` y un botón con estado de carga ("Enviando...").
- [x] MEJORA: Mostrar explícitamente el correo al cual se le está restableciendo la clave en `/reset-password` y configurar los inputs para ser reconocidos automáticamente por gestores de contraseñas (`autoComplete="username"` y `autoComplete="new-password"`).
- [ ] Mejorar y ordenar la configuración del usuario y de la organización (para los administradores de la organización) en `/settings`

## IX. Plantillas de Correo e Imagen de Marca
- [x] Diseñar formatos HTML atractivos y profesionales para los correos (registro de usuario, invitaciones de equipo, recuperación de contraseña, etc.)
- [x] Integrar el logotipo corporativo FaberDoc en formato SVG y su paleta de colores oficial (Faber Navy, Doc Medium Blue, Soft Steel Blue) en todas las vistas del sistema (sidebar, login, registro, onboarding y correos).
- [x] Resolver el bug de hidratación (Hydration Mismatch) en fechas localizadas.
- [x] MEJORA: Integrar el logotipo corporativo FaberDoc SVG en las pantallas de recuperación de contraseña, confirmación de OTP y restablecimiento de contraseña.

## X. Backlog (Futuras Mejoras & Características Premium)
- [x] Línea de tiempo (Timeline) global: Vista general en pantalla principal para el historial de actividad y trazabilidad de documentos (en lugar del drawer)
- [ ] Time Tracker (Premium): Registro de tiempos de trabajo por documento (elaboración, revisión, etc.)

