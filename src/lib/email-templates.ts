/**
 * Faberdoc Email Templates
 * Generates beautiful, responsive HTML emails with a unified design system.
 */

interface BaseEmailOptions {
  title: string;
  previewText?: string;
  contentHtml: string;
}

/**
 * Plantilla base para todos los correos de Faberdoc
 */
function getBaseEmailLayout({ title, previewText, contentHtml }: BaseEmailOptions): string {
  const previewTextHtml = previewText
    ? `<div style="display: none; max-height: 0px; overflow: hidden;">${previewText}</div>`
    : "";

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
      </style>
    </head>
    <body style="background-color: #f8fafc; margin: 0; padding: 0;">
      ${previewTextHtml}
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 10px;">
        <tr>
          <td align="center" valign="top">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              
              <!-- Header -->
              <tr>
                <td style="padding: 32px 40px 20px 40px; border-bottom: 1px solid #f1f5f9;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td>
                        <span style="font-size: 24px; font-weight: 700; color: #0f172a; letter-spacing: -0.025em;">
                          Faberdoc
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 40px 40px 32px 40px; font-size: 16px; line-height: 1.6; color: #334155;">
                  ${contentHtml}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 40px 40px 40px; border-top: 1px solid #f1f5f9; background-color: #fafafa; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                    Este es un correo automático de Faberdoc. Por favor, no respondas a este mensaje.
                  </p>
                  <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;">
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
 * 1. Correo para restablecer la contraseña
 */
export function getRecoveryEmailHtml(email: string, actionLink: string, otpCode: string): string {
  const contentHtml = `
    <h2 style="margin-top: 0; margin-bottom: 20px; font-size: 20px; font-weight: 700; color: #0f172a;">
      Restablecer tu contraseña
    </h2>
    <p style="margin: 0 0 16px 0;">Hola,</p>
    <p style="margin: 0 0 24px 0; font-size: 15px;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta asociada al correo <strong>${email}</strong>.
    </p>
    
    <!-- Botón de Acción -->
    <div style="margin: 32px 0; text-align: left;">
      <a href="${actionLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); transition: background-color 0.2s;">
        Restablecer Contraseña
      </a>
    </div>

    <!-- Código de Respaldo -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 500; color: #475569;">
        O ingresa el siguiente código de 6 dígitos en la página de verificación:
      </p>
      <div style="font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0f172a; background-color: #ffffff; display: inline-block; padding: 8px 16px; border: 1px solid #cbd5e1; border-radius: 6px;">
        ${otpCode}
      </div>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 14px; color: #64748b;">
      Si no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu contraseña seguirá siendo la misma.
    </p>
    <p style="margin: 16px 0 0 0; font-size: 12px; color: #94a3b8; word-break: break-all;">
      Enlace directo:<br />
      <a href="${actionLink}" style="color: #6366f1; text-decoration: underline;">${actionLink}</a>
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
export function getInviteEmailHtml(orgName: string, roleLabel: string, registerLink: string): string {
  const contentHtml = `
    <h2 style="margin-top: 0; margin-bottom: 20px; font-size: 20px; font-weight: 700; color: #0f172a;">
      Te invitaron a colaborar
    </h2>
    <p style="margin: 0 0 16px 0;">Hola,</p>
    <p style="margin: 0 0 24px 0; font-size: 15px;">
      Has sido invitado a unirte a la organización <strong>${orgName}</strong> en Faberdoc con el rol de <strong>${roleLabel}</strong>.
    </p>
    
    <!-- Botón de Acción -->
    <div style="margin: 32px 0; text-align: left;">
      <a href="${registerLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); transition: background-color 0.2s;">
        Aceptar Invitación
      </a>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 14px; color: #64748b;">
      Para comenzar a trabajar y acceder a los documentos del proyecto, haz clic en el botón de arriba para registrar tu cuenta.
    </p>
    <p style="margin: 16px 0 0 0; font-size: 12px; color: #94a3b8; word-break: break-all;">
      Enlace directo:<br />
      <a href="${registerLink}" style="color: #6366f1; text-decoration: underline;">${registerLink}</a>
    </p>
  `;

  return getBaseEmailLayout({
    title: `Invitación para unirte a ${orgName} en Faberdoc`,
    previewText: `Has recibido una invitación para unirte a ${orgName} en Faberdoc.`,
    contentHtml,
  });
}

/**
 * 3. Correo de bienvenida y verificación (Crear Usuario)
 */
export function getWelcomeEmailHtml(fullName: string, verificationLink: string): string {
  const contentHtml = `
    <h2 style="margin-top: 0; margin-bottom: 20px; font-size: 20px; font-weight: 700; color: #0f172a;">
      ¡Te damos la bienvenida a Faberdoc!
    </h2>
    <p style="margin: 0 0 16px 0;">Hola, ${fullName}:</p>
    <p style="margin: 0 0 24px 0; font-size: 15px;">
      Tu cuenta en Faberdoc ha sido creada exitosamente. Para verificar tu dirección de correo electrónico y activar completamente tu cuenta, por favor haz clic en el siguiente enlace:
    </p>
    
    <!-- Botón de Acción -->
    <div style="margin: 32px 0; text-align: left;">
      <a href="${verificationLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); transition: background-color 0.2s;">
        Confirmar Cuenta
      </a>
    </div>

    <p style="margin: 24px 0 0 0; font-size: 14px; color: #64748b;">
      Si no te registraste en Faberdoc, puedes ignorar este correo sin problemas.
    </p>
    <p style="margin: 16px 0 0 0; font-size: 12px; color: #94a3b8; word-break: break-all;">
      Enlace directo:<br />
      <a href="${verificationLink}" style="color: #6366f1; text-decoration: underline;">${verificationLink}</a>
    </p>
  `;

  return getBaseEmailLayout({
    title: "Bienvenido a Faberdoc",
    previewText: "Confirma tu dirección de correo electrónico para activar tu cuenta de Faberdoc.",
    contentHtml,
  });
}
