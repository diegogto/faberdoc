---
trigger: always_on
---

# GUIA DE DESARROLLO - PROYECTO FABERDOC

## 1. VISION GENERAL
Faberdoc es un sistema de Document Control para ingeniería. La interfaz debe imitar la fluidez y minimalismo de Notion: tablas potentes, paneles laterales (drawers) y gestión de estados en tiempo real.

## 2. STACK TECNOLOGICO
- **Frontend:** Next.js (App Router), Tailwind CSS, Shadcn/ui.
- **Tablas y Datos:** TanStack Table v8, TanStack Query (React Query).
- **Backend / BaaS:** Supabase (PostgreSQL, Auth, Storage) / Next.js Server Actions.
- **Base de Datos:** PostgreSQL en Supabase (Migraciones en SQL puro con políticas RLS).
- **Validacion:** Zod (estricto).
- **DevOps y Despliegue:** Git, GitHub y Dokploy (VPS) usando empaquetado `standalone` con Docker.

## 3. ESTÁNDARES DE BASE DE DATOS (Supabase / PostgreSQL)

### A. Reglas Transversales (Aplica a TODAS las tablas)
- **Auditoría:** Campos `created_at`, `updated_at` (TIMESTAMPTZ DEFAULT NOW()).
- **Soft Delete:** No usar borrado físico. Implementar columna `deleted_at` (TIMESTAMPTZ, nullable).
- **Identificadores:** Uso de UUID v4 como Primary Key (`id` con `DEFAULT uuid_generate_v4()`).
- **Seguridad:** Obligatorio implementar **Row Level Security (RLS)** en todas las tablas para garantizar que cada usuario solo acceda a los datos de su organización o proyectos asignados.

### B. Estructura de Entidades Críticas

#### 1. Organizaciones, Usuarios y Membresías
- Tabla `organizations`: Entidad legal (Dueño, Cliente o Contratista) con campo `org_type`.
- Tabla `users`: Pertenece a una `organization_id`. Su `id` debe ser un Foreign Key a `auth.users(id)` de Supabase con `ON DELETE CASCADE`.
- Tabla `project_members`: Relación entre `users` y `projects`.
    - Campos: `user_id`, `project_id`, `role` (ADMIN, REVIEWER, APPROVER, VIEWER).
    - Autonomía: El ADMIN de una organización participante puede dar de alta como `project_member` a cualquier `user` de su propia empresa.

#### 2. Suscripciones y Facturación (Monetización)
- Tabla `subscriptions`: 
    - Campos clave: `organization_id`, `plan_name`, `status` (ACTIVE, PAST_DUE, CANCELED), `storage_limit_mb`, `projects_limit`, `current_period_end`.
- Tabla `subscription_expenses`: Registros de pagos y facturación.
    - Campos clave: `subscription_id`, `amount`, `currency`, `billing_date`, `invoice_url`, `payment_status`.

#### 3. Proyectos y Configuración Dinámica
- Tabla `projects`: 
    - `organization_id`: Organización dueña.
    - `naming_pattern`: String con el formato de codificación (ej: "{PROY}-{ESP}-{NUM}").
    - `versioning_logic`: Tipo de versionamiento ('MIXED' o 'SEPARATE_EMISSION').
    - `review_flow_config`: Configuración JSONB del flujo interno de revisión (revisores, tipo de revisión paralela/subsecuente).
    - `custom_properties_definition`: JSONB que define campos dinámicos y sus opciones.
    - `client_info`: Metadata general del proyecto (JSONB).



#### 4. Documentos (Contenedor Maestro)
- Tabla `documents`: 
    - `project_id`: Relación con el proyecto.
    - `document_code`: Código único generado por el motor de nomenclatura.
    - `custom_properties`: JSONB con valores específicos (Especialidad, Área, etc.).
    - Unicidad: Clave única compuesta `UNIQUE(project_id, document_code)`.
    - Indexación: Índice compuesto en `(project_id, document_code)`.

#### 5. Revisiones y Archivos
- Tabla `revisions`: 
    - `document_id`: Relación con el documento.
    - `version_label`: Etiqueta visual (A, B, 01, 02).
    - `version_index`: Entero correlativo para ordenamiento cronológico.
    - `emission_code`: Código o etiqueta de la emisión asociada (para lógica SEPARATE_EMISSION).
    - `status`: Estado interno (DRAFT, IN_REVIEW, COMMENTED, APPROVED, ISSUED).
    - `comment_level`: Nivel de comentarios (MINOR o MAJOR) cuando la revisión está COMMENTED.
- Tabla `files`: Relación con `revisions`. Almacena `s3_key` (Ruta o Key de archivo), `file_name`, `file_size_bytes`.



#### 6. Registro de Emisiones (Issuance Log)
- Tabla `issuance_logs`: 
    - `original_planned_date`: Inmutable (Base Line).
    - `current_planned_date`: Fecha reprogramada.
    - `actual_issuance_date`: Fecha real de envío.
    - `iteration_count`: Incremento automático (+1) si la fecha se atrasa.

#### 7. Transmittals (Emisiones Formales)
- Tabla `transmittals`: Registro formal de envío vinculado a `projects`, `sender_id` y `recipient_org_id`.
- Tabla `transmittal_items` (Implícita/Intermedia): Vínculo inmutable entre Transmittal y versiones específicas de `revisions`.

#### 8. Comunicación y Comentarios
- Tabla `comments`: Comentarios formales extraídos de PDF.
    - `status`: OPEN, RESPONDED, CLOSED.
    - Soporta `response_text` y auditoría de cierre (`closed_at`).

## 4. FILOSOFIA DE INTERFAZ (UX/UI)
- **Navegacion:** Uso extensivo de 'Sheets' (Drawers) laterales para no perder contexto de la tabla principal (MDL).
- **Feedback:** 'Optimistic Updates' mediante TanStack Query para acciones de estado.
- **Estética:** Minimalista e inspirada en la paleta de colores oficial de FaberDoc:
  - **Faber Navy (`#2e3e56` / `oklch(0.32 0.045 250)`):** Color primario para texto, botones principales y estructura.
  - **Doc Medium Blue (`#3e689a` / `oklch(0.48 0.10 250)`):** Color de acento, bordes e indicadores de enfoque.
  - **Soft Steel Blue (`#a0b3cf` / `oklch(0.74 0.05 250)`):** Fondos secundarios, ilustraciones y badges.
  - **Neutral Gray (`#8e949d` / `oklch(0.64 0.01 250)`):** Color de texto secundario y bordes.
  - **Dark Mode Background (`#19202c` / `oklch(0.18 0.015 250)`):** Fondo premium del dashboard en modo oscuro.

## 5. REGLAS DE NEGOCIO CRITICAS
- **Naming Engine:** Función pura que genera el `document_code` basado en el patrón del proyecto y las `custom_properties`.
- **Lógicas de Versionamiento (Configurables por Proyecto):**
  - **MIXED:** Letras (`A`, `B`...) para borradores internos y números (`0`, `1`...) para revisiones emitidas a través de un Transmittal.
  - **SEPARATE_EMISSION:** Versión numérica secuencial (`Rev 1`, `Rev 2`...) y una etiqueta/código de emisión (`emission_code`) definida por el usuario al realizar el envío (ej: `A`, `B` o texto libre).
- **Control de Estados:**
  - **Estado Interno:** Flujo interno (`DRAFT` -> `IN_REVIEW` <-> `COMMENTED` -> `APPROVED`). El flujo de revisión es configurable por proyecto por el administrador (revisores asignados, tipo de revisión paralela o secuencial).
  - **Niveles de Comentarios (en estado COMMENTED):**
    - **MINOR (Comentarios menores):** Si el encargado vuelve a subir el documento, este pasa automáticamente a estado `APPROVED`.
    - **MAJOR (Comentarios mayores):** Al volver a subir el documento, el estado regresa a `IN_REVIEW` y debe pasar por el proceso completo de revisión.
  - **Estado Externo (Emisión):** Reflejado al emitirse el Transmittal (cambia revisión a `ISSUED` y registra fecha real).
- **Cierre de Comentarios:** Los comentarios no cerrados (`OPEN`) se arrastran automáticamente a la siguiente revisión generada.


## 6. SEGURIDAD Y ARCHIVOS
- **Almacenamiento:** Archivos subidos mediante una capa de abstracción de almacenamiento (`StorageService`) que guarda un identificador `s3_key` (path) en la base de datos. Esto desacopla el frontend de la decisión final sobre el proveedor físico de archivos.
- **Acceso:** Uso de URLs firmadas temporales o rutas de descarga provistas por el adaptador de almacenamiento seleccionado.
- **Privacidad y RLS:** Clientes/Contratistas solo ven documentos si existen en un Transmittal dirigido a su `organization_id`, garantizado a nivel de base de datos usando Supabase RLS.


## 7. INSTRUCCIONES PARA LA IA (CONTEXTO)
- **Tipado:** TypeScript estricto. Generar los tipos a partir de la base de datos de Supabase. Prohibido el uso de `any`.
- **Modularidad:** Separar las consultas de Supabase del lado del cliente y del servidor (Server Actions).
- **Validacion:** Siempre validar inputs con Zod antes de mutar datos en el servidor.
- **SQL Primero:** Si se requiere un cambio en la estructura, generar el código SQL para migraciones de Supabase antes que el código de frontend.

## 8. FLUJOS FUNCIONALES
- **Onboarding:** Registro en Supabase Auth -> Creación de `organizations` + Asignación a `users`.
- **Wizard de Proyecto:** Configuración de naming, propiedades JSONB y carga masiva de MDL.
- **Revisión y Cierre:** Carga -> Revisión Interna -> Aprobación -> Emisión -> Feedback Externo -> Respuesta a comentarios -> Cierre/Aprobación final.

## 9. MONETIZACIÓN Y LÍMITES
- **Cobro:** La suscripción se controla en la tabla `subscriptions` vinculada a la `Organization` dueña.
- **Validación de Límites en Backend:**
    - **Proyectos activos:** Contar registros en `projects` donde `deleted_at IS NULL` y comparar con `projects_limit`.
    - **Espacio:** Sumar `file_size_bytes` en tabla `files` y comparar con `storage_limit_mb`.
- **Control de Pago:** Si `subscriptions.status` es 'PAST_DUE', la interfaz bloquea las cargas de archivos y creación de transmittals (Read-Only).
- **Registro de Pagos:** Todo cobro exitoso o fallido debe insertarse en `subscription_expenses` para mantener un historial financiero por organización.