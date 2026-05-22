# Configuración de Resend y Cloudflare DNS

Esta guía detalla los pasos para agregar y verificar tu dominio en **Resend** y configurar los registros necesarios en **Cloudflare** para garantizar la entregabilidad de los correos de Faberdoc.

---

## Paso 1: Agregar el Dominio en Resend

1. Inicia sesión en tu cuenta de [Resend](https://resend.com).
2. En la barra lateral izquierda, ve a la sección **Domains** (Dominios).
3. Haz clic en el botón **Add Domain** (Agregar Dominio).
4. Introduce tu dominio (ej: `faberdoc.com`) y selecciona la región más cercana (usualmente `us-east-1`).
5. Haz clic en **Add**.

Resend generará automáticamente un listado de registros DNS que debes agregar a tu dominio. Consisten en:
*   **2 o 3 registros TXT (DKIM):** Claves criptográficas para firmar y validar la identidad de los correos.
*   **1 registro MX:** Para el enrutamiento de correos de retorno (feedback).
*   **1 registro TXT (SPF):** (Opcional si ya tienes SPF, obligatorio para indicar que Resend puede enviar correos en tu nombre).

---

## Paso 2: Configurar los Registros DNS en Cloudflare

1. Inicia sesión en tu panel de [Cloudflare](https://dash.cloudflare.com).
2. Selecciona tu dominio (ej: `faberdoc.com`).
3. En la barra lateral, ve a **DNS** -> **Records** (Registros DNS).
4. Añade los registros proporcionados por Resend uno por uno haciendo clic en **Add Record**.

### Especificaciones de los registros en Cloudflare:

#### A. Registros DKIM (TXT)
Resend te dará de 2 a 3 registros tipo `TXT`.
*   **Type:** `TXT`
*   **Name (Host):** Copia el Host que te da Resend (ej: `resend._domainkey` o similar).
*   **Content (Value):** Copia el valor largo provisto por Resend.
*   **TTL:** Deja en `Auto`.
*   **Proxy Status:** Asegúrate de que **NO** tenga proxy (debe decir *DNS Resolution only*, el icono de la nube debe estar en gris/desactivado).

#### B. Registro SPF (TXT)
El registro SPF le dice a los proveedores (Gmail, Outlook) que Resend está autorizado para enviar correos desde tu dominio.
*   **Si NO tienes un registro SPF previo:**
    *   **Type:** `TXT`
    *   **Name (Host):** `@` (que representa tu dominio raíz).
    *   **Content (Value):** `v=spf1 include:feedback-smtp.us-east-1.amazonses.com ~all` (o el valor que te especifique Resend).
*   **Si YA tienes un registro SPF previo (ejemplo: Google Workspace):**
    *   **NO crees otro registro SPF** (múltiples registros SPF invalidan la verificación).
    *   Edita el registro existente e incluye la directiva de Resend antes de `~all` o `-all`. Por ejemplo:
        `v=spf1 include:_spf.google.com include:feedback-smtp.us-east-1.amazonses.com ~all`

#### C. Registro MX (Mail Exchange)
Resend usa esto para recibir respuestas del estado de entrega.
*   **Type:** `MX`
*   **Name (Host):** Copia el host que te da Resend (usualmente un subdominio como `bounces` o `mail`).
*   **Mail Server:** El servidor provisto (ej: `feedback-smtp.us-east-1.amazonses.com`).
*   **Priority:** `10` (o el valor que indique Resend).
*   **Proxy Status:** Apagado (Nube gris).

#### D. Configuración de DMARC (Altamente Recomendado)
DMARC protege tu dominio contra la suplantación de identidad. Si no lo tienes configurado en Cloudflare, crea este registro:
*   **Type:** `TXT`
*   **Name (Host):** `_dmarc` (se resolverá como `_dmarc.tudominio.com`).
*   **Content (Value):** `v=DMARC1; p=none; pct=100; rua=mailto:dmarc-reports@tudominio.com`
    *(Nota: Reemplaza `dmarc-reports@tudominio.com` con una dirección tuya o usa `p=none` simple sin reporte: `v=DMARC1; p=none;`)*.

---

## Paso 3: Verificar en Resend

1. Una vez agregados los registros en Cloudflare, vuelve a la consola de Resend.
2. En la página de tu dominio, haz clic en **Verify** (Verificar).
3. Cloudflare suele propagar los DNS de inmediato (en segundos), por lo que la verificación debería cambiar de **Pending** (Pendiente) a **Verified** (Verificado) casi al instante.

¡Listo! A partir de ese momento ya puedes enviar correos desde cualquier dirección bajo tu dominio (ej: `cualquier-nombre@tudominio.com`).
