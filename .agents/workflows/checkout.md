---
description: Cierre de sesión, actualización de progreso y backlog
---

# Workflow: Check-out

Este workflow se activa cuando el usuario solicita realizar un "checkout".

## Instrucciones para Antigravity

1.  **Revisión de Sesión:** Analiza la conversación y las acciones realizadas desde el último `checkin` o desde el inicio de la conversación actual.
2.  **Actualización de todo.md:**
    *   **Limpieza:** Identifica las tareas que se completaron durante la sesión y márcalas como hechas o elimínalas de la lista de pendientes según el formato de `todo.md`.
    *   **Adiciones:** Agrega cualquier nuevo requerimiento, corrección pendiente o idea futura que se haya discutido durante la sesión.
3.  **Actualización de sessions.md:** Documenta la sesión actual en `sessions.md`, incluyendo fecha, objetivos, cambios realizados y acuerdos.
4.  **Verificación Técnica:** Ejecuta `npm run build` en la raíz del proyecto para asegurar que no existan errores de tipos o compilación que rompan el despliegue.
5.  **Actualización del schema de la base de datos:** Aplica todos los cambios necesarios en el archivo schema.sql para reflejar los cambios que se hicieron en la estructura de la base de datos (tablas, reglas, etc).
6.  **Resumen de Cierre:** Muestra al usuario un resumen de los cambios realizados en `todo.md` y `sessions.md`, confirma el éxito del build y despídete formalmente hasta la próxima sesión.