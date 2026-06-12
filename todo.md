# Faberdoc - Lista de Pendientes (TODO)

## I. Infraestructura, Despliegue y Monetización (Backbone)
- [x] Configuración de Docker para desplegar Next.js standalone en Dokploy (Puerto 3000)
- [x] Configuración e inyección de variables de entorno build-time de Supabase en Dokploy
- [x] Configuración de comunicación local / remota con la API de Supabase
- [x] Validación de límites de proyectos activos y espacio en disco en base de datos/backend
- [x] Bloqueo de operaciones de escritura (modo Read-Only) si la suscripción pasa a `PAST_DUE`
- [x] Historial financiero: inserción de cobros exitosos o fallidos en `subscription_expenses`

## II. Autenticación, Organización y Gestión de Usuarios
- [x] Corrección de redirección y resolución de colisión de ruta raíz (`/`)
- [x] Implementación de logs para diagnóstico de Supabase Auth en Server Actions (error 502/SMTP)
- [x] Corrección de error de contexto en `DropdownMenuLabel` (Base UI compatibility)
- [x] Onboarding completo: Registro -> Creación de organización (`organizations`) -> Asignación de rol (con prevención de duplicados corporativos por dominio y bypass de sucursal)
- [x] Control de Suscripción en Onboarding (crear registro en `subscriptions` con plan default 'FREE')
- [x] BUG: Al registrar un nuevo usuario, sólo se muestra el aviso de revisar el correo pero no se redirige automáticamente a la página para ingresar el código OTP. Debería redirigir a la vista de confirmación informando que se envió un código o puede seguir el link del correo.
- [x] MEJORA: En el flujo de onboarding de un nuevo miembro para una organización existente (por coincidencia de dominio), sólo se deben listar los usuarios administradores (ADMIN) de dicha organización para solicitarles acceso.
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
- [ ] Separar la configuración en el menú de usuario (arriba a la derecha): crear "Mi Perfil" (solo datos del usuario) y "Organización" (solo datos de la organización, renombrando el menú actual), evitando combinar ambas configuraciones en la misma vista.
- [ ] Mejorar y ordenar la configuración del usuario y de la organización (para los administradores de la organización) en `/settings`
- [ ] En todas las secciones donde se invitan usuarios, indicar cuándo se envió la última invitación y añadir un botón para "reenviar invitación".

## III. Gestión de Proyectos y Configuración
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
- [ ] Simplificar el modal de creación de proyectos: eliminar las opciones de tipo de versión y el flujo de revisión. Agregar selección de templates de tipos de proyectos (solicitar templates a configurar cuando se pida la implementación).

## IV. Maestro de Documentos (Tablas, Ordenamiento y Filtros)
- [x] Tabla principal interactiva (TanStack Table v8 + TanStack Query)
- [x] Filtros avanzados y ordenamiento por metadatos dinámicos
- [x] Carga masiva de MDL mediante importación (CSV/Excel)
- [x] Panel lateral (Sheet/Drawer) para inspeccionar metadatos y línea de tiempo de revisiones sin perder contexto
- [x] Habilitar la modificación del ancho del sidebar (panel lateral/Sheet) del documento
- [ ] Mover los filtros de atributos dinámicos desde la cabecera general del Maestro de Documentos hacia la cabecera de cada columna de la tabla (con soporte para multi-selección de valores similares).
- [ ] Limpiar los indicadores de ordenamiento (sort) en las cabeceras de las tablas del Maestro de Documentos: no mostrar los iconos de ordenamiento por defecto, y mostrar el icono de ascendente o descendente únicamente en la columna que está siendo ordenada.

## V. Ciclo de Vida Documental y Flujos de Revisión
- [x] Carga de archivos a Supabase Storage con subida directa y segura
- [x] Generación de URLs firmadas (Presigned URLs) con expiración corta para descarga
- [x] Lógica de versionamiento dinámico (`version_index` y `version_label`)
- [ ] Reflejar en la vista del documento/revisión el flujo de revisión definido en los diagramas de flujos del proyecto.
- [ ] Permitir al usuario seleccionar manualmente un flujo de revisión diferente para un documento/revisión si así lo requiere.
- [ ] Mejorar el flujo de aprobación de documentos.
- [ ] Corregir la compaginación del modal "Configurar reglas del flujo" y añadir soporte para reglas combinadas ("and" y "or").
- [ ] En el configurador de flujo, eliminar el bloque "OR" (se asume implícito cuando múltiples líneas llegan a un nodo).
- [x] Separación de carriles: aislar y separar los Comentarios (conversaciones internas e hilos) de las Incidencias (registro formal de problemas y observaciones del cliente/revisor).
- [x] Rediseñar la sección de detalles del documento para albergar conversaciones/hilos continuos de Comentarios entre usuarios del sistema.
- [x] Implementar el módulo de Incidencias (Issues) para registrar fallas detectadas, soportar carga directa como notas al subir el archivo, y resolverlas con respuestas de remediación.
- [x] Habilitar una pestaña/vista general de "Incidencias" dentro del proyecto para revisar, buscar y responder a las incidencias a nivel de todo el proyecto.
- [x] Mostrar e integrar el listado y la gestión de incidencias específicas del documento dentro de su drawer lateral de detalles.

## VI. Emisiones, Programador y Transmittals
- [x] Emisiones Formales (Transmittals) y asociación inmutable a revisiones
- [x] Control de fechas estimadas vs reales en `issuance_logs` (reprogramaciones automáticas)
- [x] Lógica de arrastre de incidencias abiertas (`OPEN`) a la siguiente revisión
- [ ] Habilitar el programador de envíos, tanto en el documento individual como en envíos (Transmittals).
- [ ] Importación y extracción de incidencias (Issues) desde comentarios anotados en la versión PDF del documento.

## VII. Interfaz de Usuario y Marca (UI/UX)
- [x] Diseñar formatos HTML atractivos y profesionales para los correos (registro de usuario, invitaciones de equipo, recuperación de contraseña, etc.)
- [x] Integrar el logotipo corporativo FaberDoc en formato SVG y su paleta de colores oficial (Faber Navy, Doc Medium Blue, Soft Steel Blue) en todas las vistas del sistema (sidebar, login, registro, onboarding y correos).
- [x] Resolver el bug de hidratación (Hydration Mismatch) en fechas localizadas.
- [x] MEJORA: Integrar el logotipo corporativo FaberDoc SVG en las pantallas de recuperación de contraseña, confirmación de OTP y restablecimiento de contraseña.
- [ ] Limpiar los mensajes de éxito/error de las páginas: reemplazar los recuadros verdes y rojos estáticos en medio de los bloques por notificaciones tipo toast para mejorar la experiencia de usuario.

## VIII. Backlog (Características Premium)
- [x] Línea de tiempo (Timeline) global: Vista general en pantalla principal para el historial de actividad y trazabilidad de documentos (en lugar del drawer)
- [ ] Time Tracker (Premium): Registro de tiempos de trabajo por documento (elaboración, revisión, etc.)

## IX. Preguntas y Hallazgos de Graphify
- [ ] Analizar la conectividad cruzada de `cn()` (puente en 12 comunidades de interfaz) y evaluar si se requiere desacoplar el formateo de estilos en componentes de presentación.
- [/] Revisar el alto acoplamiento de `createClient()` (cliente de Supabase en 19 comunidades) y evaluar si se pueden migrar más interacciones directas con la base de datos a Server Actions o servicios unificados (Refactorizados todas las páginas y layouts en projects/[projectId]).
- [ ] Analizar el uso de `Button()` y su conectividad cruzada en modales, formularios y vistas.
- [x] Validar si las 4 relaciones inferidas de `createAdminClient()` (con `.createSignedUploadUrl()`, `.deleteFile()`, etc.) son correctas y respetan la seguridad RLS (Auditadas y segurizadas a nivel de Server Actions).
- [ ] Investigar nodos aislados o débilmente conectados (`$schema`, `style`, `rsc`, etc.) para identificar componentes huérfanos o brechas en la documentación.
- [ ] Evaluar la cohesión de `Document Management Dialogs & Forms` (cohesión: 0.08) para decidir si debe ser subdividida en componentes más específicos.
- [ ] Evaluar la cohesión de `Project Dependencies & External Libraries` (cohesión: 0.05) para simplificar y limpiar dependencias no utilizadas en `package.json`.

