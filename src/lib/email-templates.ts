/**
 * Faberdoc Email Templates
 * Generates beautiful, responsive HTML emails with a unified Notion-style design system.
 */

interface BaseEmailOptions {
  title: string;
  previewText?: string;
  contentHtml: string;
  logoUrl?: string | null;
}

/**
 * Plantilla base para todos los correos de Faberdoc
 */
function getBaseEmailLayout({ title, previewText, contentHtml, logoUrl }: BaseEmailOptions): string {
  const previewTextHtml = previewText
    ? `<div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">${previewText}</div>`
    : "";

  const headerContent = logoUrl
    ? `
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="left" valign="middle">
            <img src="${logoUrl}" alt="Logo" style="height: 36px; max-height: 36px; max-width: 180px; object-fit: contain; display: block;" />
          </td>
          <td align="right" valign="middle" style="font-size: 11px; color: #94a3b8; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            vía <span style="color: #2e3e56; font-weight: 600;">Faber</span><span style="color: #8e949d; font-weight: 600;">Doc</span>
          </td>
        </tr>
      </table>
    `
    : `
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td>
            <span style="font-size: 20px; font-weight: 700; letter-spacing: -0.025em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <span style="color: #2e3e56;">Faber</span><span style="color: #8e949d;">Doc</span>
            </span>
          </td>
        </tr>
      </table>
    `;

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          width: 100% !important;
          background-color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          color: #334155;
        }
        table {
          border-collapse: collapse;
        }
        img {
          border: 0;
          height: auto;
          line-height: 100%;
          outline: none;
          text-decoration: none;
        }
        a {
          color: #3e689a;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body style="background-color: #f8fafc; margin: 0; padding: 0;">
      ${previewTextHtml}
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 10px;">
        <tr>
          <td align="center" valign="top">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(15, 23, 42, 0.03);">
              
              <!-- Header -->
              <tr>
                <td style="padding: 24px 32px; border-bottom: 1px solid #f1f5f9;">
                  ${headerContent}
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 36px 32px; font-size: 15px; line-height: 1.6; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  ${contentHtml}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; border-top: 1px solid #f1f5f9; background-color: #fafafa; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                    Este es un correo automático de Faberdoc. Por favor, no respondas a este mensaje.
                  </p>
                  <p style="margin: 6px 0 0 0; font-size: 12px; color: #94a3b8;">
                    &copy; ${new Date().getFullYear()} Faberdoc. Todos los derechos reservados.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * 1. Correo para restablecer la contraseña (Estilo Ticket OTP)
 */
export function getRecoveryEmailHtml(email: string, actionLink: string, otpCode: string): string {
  const contentHtml = `
    <h2 style="margin-top: 0; margin-bottom: 16px; font-size: 18px; font-weight: 700; color: #2e3e56; letter-spacing: -0.01em;">
      Restablecer tu contraseña
    </h2>
    <p style="margin: 0 0 16px 0; color: #475569;">Hola,</p>
    <p style="margin: 0 0 24px 0; color: #475569;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta asociada al correo <strong>${email}</strong>.
    </p>
    
    <!-- OTP Ticket Component -->
    <div style="background-color: #fafbfc; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 24px; text-align: center; margin: 28px 0;">
      <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: 700; display: block; margin-bottom: 8px;">
        Código de Verificación Temporal
      </span>
      <div style="font-family: monospace; font-size: 30px; font-weight: 800; letter-spacing: 6px; color: #2e3e56; padding: 10px 20px; display: inline-block; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
        ${otpCode}
      </div>
      <p style="margin: 12px 0 0 0; font-size: 11px; color: #64748b;">
        Este código expira en 15 minutos.
      </p>
    </div>

    <!-- Botón de Acción -->
    <div style="margin: 28px 0; text-align: center;">
      <a href="${actionLink}" style="display: inline-block; background-color: #2e3e56; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);">
        Restablecer Contraseña
      </a>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 13px; color: #64748b;">
      Si no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu contraseña seguirá siendo la misma.
    </p>
    <p style="margin: 16px 0 0 0; font-size: 11px; color: #94a3b8; word-break: break-all;">
      Enlace directo:<br />
      <a href="${actionLink}" style="color: #3e689a; text-decoration: underline;">${actionLink}</a>
    </p>
  `;

  return getBaseEmailLayout({
    title: "Restablecer contraseña - Faberdoc",
    previewText: "Usa este enlace o código para cambiar tu contraseña en Faberdoc.",
    contentHtml,
  });
}

/**
 * 2. Correo de invitación a una organización
 */
export function getInviteEmailHtml(orgName: string, roleLabel: string, registerLink: string, logoUrl?: string | null): string {
  const contentHtml = `
    <h2 style="margin-top: 0; margin-bottom: 16px; font-size: 18px; font-weight: 700; color: #2e3e56; letter-spacing: -0.01em;">
      Invitación de Colaboración
    </h2>
    <p style="margin: 0 0 16px 0; color: #475569;">Hola,</p>
    <p style="margin: 0 0 24px 0; color: #475569;">
      Has sido invitado a unirte a la organización <strong>${orgName}</strong> en Faberdoc con el rol de <strong>${roleLabel}</strong>.
    </p>
    
    <!-- Botón de Acción -->
    <div style="margin: 28px 0; text-align: center;">
      <a href="${registerLink}" style="display: inline-block; background-color: #2e3e56; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);">
        Aceptar Invitación
      </a>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 13px; color: #64748b;">
      Para comenzar a trabajar y acceder a los documentos del proyecto, haz clic en el botón de arriba para registrar o vincular tu cuenta.
    </p>
    <p style="margin: 16px 0 0 0; font-size: 11px; color: #94a3b8; word-break: break-all;">
      Enlace directo:<br />
      <a href="${registerLink}" style="color: #3e689a; text-decoration: underline;">${registerLink}</a>
    </p>
  `;

  return getBaseEmailLayout({
    title: `Invitación para unirte a ${orgName} en Faberdoc`,
    previewText: `Has recibido una invitación para unirte a ${orgName} en Faberdoc.`,
    contentHtml,
    logoUrl,
  });
}

/**
 * 3. Correo de bienvenida y verificación (Estilo Ticket OTP)
 */
export function getWelcomeEmailHtml(fullName: string, verificationLink: string, otpCode?: string): string {
  const otpSection = otpCode
    ? `
      <div style="background-color: #fafbfc; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 24px; text-align: center; margin: 28px 0;">
        <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: 700; display: block; margin-bottom: 8px;">
          Código de Verificación Temporal
        </span>
        <div style="font-family: monospace; font-size: 30px; font-weight: 800; letter-spacing: 6px; color: #2e3e56; padding: 10px 20px; display: inline-block; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
          ${otpCode}
        </div>
      </div>
    `
    : "";

  const contentHtml = `
    <h2 style="margin-top: 0; margin-bottom: 16px; font-size: 18px; font-weight: 700; color: #2e3e56; letter-spacing: -0.01em;">
      ¡Te damos la bienvenida a Faberdoc!
    </h2>
    <p style="margin: 0 0 16px 0; color: #475569;">Hola, ${fullName}:</p>
    <p style="margin: 0 0 24px 0; color: #475569;">
      Tu cuenta en Faberdoc ha sido creada exitosamente. Para verificar tu dirección de correo electrónico y activar completamente tu cuenta, por favor ingresa el siguiente código o haz clic en el botón de abajo:
    </p>
    
    ${otpSection}

    <!-- Botón de Acción -->
    <div style="margin: 28px 0; text-align: center;">
      <a href="${verificationLink}" style="display: inline-block; background-color: #2e3e56; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);">
        Confirmar Cuenta
      </a>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 13px; color: #64748b;">
      Si no te registraste en Faberdoc, puedes ignorar este correo sin problemas.
    </p>
    <p style="margin: 16px 0 0 0; font-size: 11px; color: #94a3b8; word-break: break-all;">
      Enlace directo:<br />
      <a href="${verificationLink}" style="color: #3e689a; text-decoration: underline;">${verificationLink}</a>
    </p>
  `;

  return getBaseEmailLayout({
    title: "Bienvenido a Faberdoc",
    previewText: "Confirma tu dirección de correo electrónico para activar tu cuenta de Faberdoc.",
    contentHtml,
  });
}

/**
 * 4. Notificación de Transmittal emitido (con tabla de documentos)
 */
export function getTransmittalEmailHtml(
  senderOrgName: string,
  recipientOrgName: string,
  transmittalCode: string,
  projectName: string,
  transmittalLink: string,
  documents: Array<{ code: string; title: string; revision: string }>,
  logoUrl?: string | null
): string {
  const documentsRows = documents
    .map(
      (doc) => `
      <tr style="border-bottom: 1px solid #f1f5f9; color: #334155;">
        <td style="padding: 10px; font-family: monospace; font-size: 12px; font-weight: 600; color: #2e3e56;">
          ${doc.code}
        </td>
        <td style="padding: 10px; font-size: 13px;">
          ${doc.title}
        </td>
        <td style="padding: 10px; font-size: 13px; text-align: center;">
          <span style="background-color: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0; font-weight: 600; font-size: 11px;">
            ${doc.revision}
          </span>
        </td>
      </tr>
    `
    )
    .join("");

  const contentHtml = `
    <h2 style="margin-top: 0; margin-bottom: 16px; font-size: 18px; font-weight: 700; color: #2e3e56; letter-spacing: -0.01em;">
      Transmittal Emitido: ${transmittalCode}
    </h2>
    <p style="margin: 0 0 16px 0; color: #475569;">Hola,</p>
    <p style="margin: 0 0 20px 0; color: #475569;">
      La organización <strong>${senderOrgName}</strong> ha emitido el Transmittal formal <strong>${transmittalCode}</strong> para <strong>${recipientOrgName}</strong> en el proyecto <strong>${projectName}</strong>.
    </p>

    <!-- Resumen de Documentos -->
    <h3 style="font-size: 14px; font-weight: 700; color: #2e3e56; margin: 24px 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">
      Documentos Incluidos
    </h3>
    <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <th align="left" style="padding: 10px; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">Código</th>
            <th align="left" style="padding: 10px; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase;">Título</th>
            <th align="center" style="padding: 10px; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; width: 60px;">Rev</th>
          </tr>
        </thead>
        <tbody>
          ${documentsRows}
        </tbody>
      </table>
    </div>

    <!-- Botón de Acción -->
    <div style="margin: 28px 0; text-align: center;">
      <a href="${transmittalLink}" style="display: inline-block; background-color: #2e3e56; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);">
        Ver Transmittal y Descargar Archivos
      </a>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 12px; color: #94a3b8; word-break: break-all;">
      Enlace directo:<br />
      <a href="${transmittalLink}" style="color: #3e689a; text-decoration: underline;">${transmittalLink}</a>
    </p>
  `;

  return getBaseEmailLayout({
    title: `Transmittal ${transmittalCode} - Faberdoc`,
    previewText: `Nuevo Transmittal ${transmittalCode} emitido en ${projectName}.`,
    contentHtml,
    logoUrl,
  });
}

/**
 * 5. Correo de asignación a un proyecto
 */
export function getProjectInviteEmailHtml(
  userName: string,
  projectName: string,
  projectRole: string,
  projectLink: string,
  logoUrl?: string | null
): string {
  const contentHtml = `
    <h2 style="margin-top: 0; margin-bottom: 16px; font-size: 18px; font-weight: 700; color: #2e3e56; letter-spacing: -0.01em;">
      Asignación de Proyecto
    </h2>
    <p style="margin: 0 0 16px 0; color: #475569;">Hola, ${userName}:</p>
    <p style="margin: 0 0 24px 0; color: #475569;">
      Has sido asignado al proyecto <strong>${projectName}</strong> en Faberdoc con el rol de <strong>${projectRole}</strong>. Ya tienes acceso para ver y gestionar la documentación del proyecto.
    </p>

    <!-- Botón de Acción -->
    <div style="margin: 28px 0; text-align: center;">
      <a href="${projectLink}" style="display: inline-block; background-color: #2e3e56; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);">
        Ir al Proyecto
      </a>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 12px; color: #94a3b8; word-break: break-all;">
      Enlace directo:<br />
      <a href="${projectLink}" style="color: #3e689a; text-decoration: underline;">${projectLink}</a>
    </p>
  `;

  return getBaseEmailLayout({
    title: `Asignación a ${projectName} - Faberdoc`,
    previewText: `Has sido asignado al proyecto ${projectName} en Faberdoc.`,
    contentHtml,
    logoUrl,
  });
}

/**
 * 6. Documento pendiente de revisión (Notificación a REVIEWERs)
 */
export function getReviewPendingEmailHtml(
  projectName: string,
  documentCode: string,
  documentTitle: string,
  revisionLabel: string,
  reviewLink: string,
  logoUrl?: string | null
): string {
  const contentHtml = `
    <h2 style="margin-top: 0; margin-bottom: 16px; font-size: 18px; font-weight: 700; color: #2e3e56; letter-spacing: -0.01em;">
      Documento Pendiente de Revisión
    </h2>
    <p style="margin: 0 0 16px 0; color: #475569;">Hola,</p>
    <p style="margin: 0 0 20px 0; color: #475569;">
      Se ha cargado una nueva versión de documento en el proyecto <strong>${projectName}</strong> que requiere tu revisión.
    </p>

    <!-- Document Info Card -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding-bottom: 8px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; width: 100px;">Código:</td>
          <td style="padding-bottom: 8px; font-size: 14px; font-weight: 700; color: #2e3e56; font-family: monospace;">${documentCode}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 8px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Título:</td>
          <td style="padding-bottom: 8px; font-size: 14px; color: #334155;">${documentTitle}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Revisión:</td>
          <td>
            <span style="background-color: #e2e8f0; color: #334155; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 11px;">
              ${revisionLabel}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Botón de Acción -->
    <div style="margin: 28px 0; text-align: center;">
      <a href="${reviewLink}" style="display: inline-block; background-color: #2e3e56; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);">
        Iniciar Revisión
      </a>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 12px; color: #94a3b8; word-break: break-all;">
      Enlace directo:<br />
      <a href="${reviewLink}" style="color: #3e689a; text-decoration: underline;">${reviewLink}</a>
    </p>
  `;

  return getBaseEmailLayout({
    title: "Documento en revisión - Faberdoc",
    previewText: `Revisión requerida para ${documentCode} en ${projectName}.`,
    contentHtml,
    logoUrl,
  });
}

/**
 * 7. Documento comentado/rechazado (Alert a cargador, CC a reviewers)
 */
export function getDocumentCommentedEmailHtml(
  uploaderName: string,
  projectName: string,
  documentCode: string,
  documentTitle: string,
  revisionLabel: string,
  commentLevel: 'MINOR' | 'MAJOR',
  commentsCount: number,
  detailLink: string,
  logoUrl?: string | null
): string {
  const levelBadgeColor = commentLevel === 'MAJOR' ? '#ef4444' : '#f59e0b';
  const levelBadgeBg = commentLevel === 'MAJOR' ? '#fef2f2' : '#fffbeb';
  const levelBadgeBorder = commentLevel === 'MAJOR' ? '#fee2e2' : '#fef3c7';
  const levelText = commentLevel === 'MAJOR' ? 'MAYOR (Re-revisión completa)' : 'MENOR (Aprobación al resubir)';

  const contentHtml = `
    <h2 style="margin-top: 0; margin-bottom: 16px; font-size: 18px; font-weight: 700; color: #2e3e56; letter-spacing: -0.01em;">
      Documento Comentado
    </h2>
    <p style="margin: 0 0 16px 0; color: #475569;">Hola, ${uploaderName}:</p>
    <p style="margin: 0 0 20px 0; color: #475569;">
      Tu documento cargado en el proyecto <strong>${projectName}</strong> ha recibido comentarios por parte del equipo revisor.
    </p>

    <!-- Document Info Card -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding-bottom: 8px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; width: 120px;">Código:</td>
          <td style="padding-bottom: 8px; font-size: 14px; font-weight: 700; color: #2e3e56; font-family: monospace;">${documentCode}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 8px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Título:</td>
          <td style="padding-bottom: 8px; font-size: 14px; color: #334155;">${documentTitle}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 8px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Revisión:</td>
          <td style="padding-bottom: 8px;">
            <span style="background-color: #e2e8f0; color: #334155; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 11px;">
              ${revisionLabel}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom: 8px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Nivel de Comentarios:</td>
          <td style="padding-bottom: 8px;">
            <span style="background-color: ${levelBadgeBg}; color: ${levelBadgeColor}; border: 1px solid ${levelBadgeBorder}; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 11px;">
              ${levelText}
            </span>
          </td>
        </tr>
        <tr>
          <td style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Comentarios:</td>
          <td style="font-size: 14px; font-weight: 700; color: #2e3e56;">${commentsCount} comentario(s) registrado(s)</td>
        </tr>
      </table>
    </div>

    <!-- Botón de Acción -->
    <div style="margin: 28px 0; text-align: center;">
      <a href="${detailLink}" style="display: inline-block; background-color: #2e3e56; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);">
        Ver Detalles e Responder
      </a>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 12px; color: #94a3b8; word-break: break-all;">
      Enlace directo:<br />
      <a href="${detailLink}" style="color: #3e689a; text-decoration: underline;">${detailLink}</a>
    </p>
  `;

  return getBaseEmailLayout({
    title: "Documento comentado - Faberdoc",
    previewText: `El documento ${documentCode} ha sido comentado en ${projectName}.`,
    contentHtml,
    logoUrl,
  });
}

/**
 * 8. Documento aprobado (Alert a Coordinadores y Admins)
 */
export function getDocumentApprovedEmailHtml(
  projectName: string,
  documentCode: string,
  documentTitle: string,
  revisionLabel: string,
  detailLink: string,
  logoUrl?: string | null
): string {
  const contentHtml = `
    <h2 style="margin-top: 0; margin-bottom: 16px; font-size: 18px; font-weight: 700; color: #2e3e56; letter-spacing: -0.01em;">
      Documento Aprobado Internamente
    </h2>
    <p style="margin: 0 0 16px 0; color: #475569;">Hola,</p>
    <p style="margin: 0 0 20px 0; color: #475569;">
      El siguiente documento ha completado el flujo de revisión interna y ha sido **Aprobado**. Está listo para ser emitido formalmente mediante Transmittal.
    </p>

    <!-- Document Info Card -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding-bottom: 8px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; width: 100px;">Código:</td>
          <td style="padding-bottom: 8px; font-size: 14px; font-weight: 700; color: #2e3e56; font-family: monospace;">${documentCode}</td>
        </tr>
        <tr>
          <td style="padding-bottom: 8px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Título:</td>
          <td style="padding-bottom: 8px; font-size: 14px; color: #334155;">${documentTitle}</td>
        </tr>
        <tr>
          <td style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Revisión:</td>
          <td>
            <span style="background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 11px;">
              ${revisionLabel} - APROBADO
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Botón de Acción -->
    <div style="margin: 28px 0; text-align: center;">
      <a href="${detailLink}" style="display: inline-block; background-color: #2e3e56; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);">
        Ver Documento y Emitir
      </a>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 12px; color: #94a3b8; word-break: break-all;">
      Enlace directo:<br />
      <a href="${detailLink}" style="color: #3e689a; text-decoration: underline;">${detailLink}</a>
    </p>
  `;

  return getBaseEmailLayout({
    title: "Documento aprobado - Faberdoc",
    previewText: `El documento ${documentCode} ha sido aprobado internamente en ${projectName}.`,
    contentHtml,
    logoUrl,
  });
}
