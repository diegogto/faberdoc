---
description: Ejecuta una prueba automatizada en vivo en el navegador usando el subagente de navegación
---

# Workflow: Prueba en Vivo en el Navegador

Este workflow automatiza la verificación visual y funcional de la aplicación en tiempo real, validando que el servidor de desarrollo esté activo y ejecutando el subagente de navegación para probar exhaustivamente todas las funcionalidades implementadas.

## Credenciales de Prueba por Defecto
- **Usuario:** `diegomorenus@gmail.com`
- **Contraseña:** `12345678`

## Instrucciones para Antigravity

1.  **Detección del Servidor de Desarrollo:**
    *   Verifica si el puerto local (por defecto `http://localhost:3000` para Next.js) está respondiendo.
    *   Si no está levantado, inicia o propone iniciar el servidor con `npm run dev` en segundo plano utilizando la herramienta de ejecución de comandos.

2.  **Preparación y Lanzamiento de `browser_subagent`:**
    *   Configura una tarea del subagente con un `TaskName` claro (ej. "Prueba Completa de Funcionalidades") y `RecordingName` (ej. `full_integration_test`).
    *   Redacta un `Task` sumamente específico con los siguientes pasos de navegación y verificación:

    *   **Paso 1: Inicio de Sesión**
        *   Navegar a `/login` e ingresar las credenciales de prueba por defecto.
        *   Confirmar el ingreso exitoso.

    *   **Paso 2: Crear un Proyecto Nuevo**
        *   Navegar a la sección de proyectos y registrar un nuevo proyecto (ej. "Proyecto de Prueba Alfa").

    *   **Paso 3: Gestión de Documentos (MDL)**
        *   Ingresar al MDL del proyecto recién creado.
        *   Crear un documento unitario completando los campos obligatorios.
        *   Editar el documento creado (modificando algún campo y guardando los cambios).

    *   **Paso 4: Panel del Usuario y Configuración**
        *   Ingresar a la sección de Configuración (`/settings`).
        *   Recorrer todas las pestañas y opciones disponibles (Perfil, Organización, Miembros, etc.).

    *   **Paso 5: Gestión de Registros (Envíos / Transmittals)**
        *   Navegar a la sección de Envíos / Transmittals.
        *   Generar un envío de prueba y añadir registros o versiones según las capacidades del módulo.

    *   **Paso 6: Validación de Funcionalidades Locales**
        *   Interactuar con toda otra funcionalidad que esté implementada en la UI que no requiera interacción con otros usuarios.

3.  **Monitoreo y Diagnóstico de Errores:**
    *   Durante toda la navegación, supervisa el DOM y la consola del navegador.
    *   Asegúrate de comprobar que ninguna vista, diálogo o modal presente:
        *   Errores de renderizado en el cliente (Next.js crash screens, páginas en blanco).
        *   Errores de hidratación severos o bloqueos.
        *   Respuestas fallidas del servidor en red (500 Internal Server Error, etc.).

4.  **Mitigación de Errores Detectados:**
    *   **Errores simples de corregir:** Si identificas un error de código, tipado, CSS o configuración de fácil resolución, realízalo inmediatamente en el código y vuelve a ejecutar la prueba.
    *   **Errores complejos:** Si los errores requieren cambios arquitectónicos profundos, rediseño de base de datos o lógica compleja que no pueda ser resuelta de inmediato:
        *   Interrumpe la prueba temporalmente.
        *   Documenta y detalla cada error detectado en el archivo `todo.md` en una sección especial para ser corregidos en posteriores sesiones.

5.  **Reporte Final:**
    *   Informa al usuario los resultados de la prueba indicando qué pasos se ejecutaron con éxito y cuáles presentaron inconvenientes.
    *   Indica la ruta del video grabado (ubicado en el directorio de artefactos) para su revisión visual.
