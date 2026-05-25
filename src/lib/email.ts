/**
 * Wrapper de entregabilidad de correos electrónicos.
 * Utiliza la API de Resend mediante HTTP fetch.
 */
export async function sendEmail({
  to,
  subject,
  html,
  cc,
  bcc,
}: {
  to: string;
  subject: string;
  html: string;
  cc?: string | string[];
  bcc?: string | string[];
}) {
  const apiKey = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_ADMIN_EMAIL || "no-reply@faberdoc.com";

  // Si no está configurada la API key de Resend o estamos en desarrollo sin ella,
  // logueamos el correo para depuración.
  if (!apiKey || !apiKey.startsWith("re_")) {
    console.log("=== [EMAIL LOG (Desarrollo)] ===");
    console.log(`De: ${fromEmail}`);
    console.log(`Para: ${to}`);
    if (cc) console.log(`CC: ${JSON.stringify(cc)}`);
    if (bcc) console.log(`BCC: ${JSON.stringify(bcc)}`);
    console.log(`Asunto: ${subject}`);
    console.log(`Contenido HTML: \n${html}`);
    console.log("================================");
    return { success: true, mock: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: `Faberdoc <${fromEmail}>`,
        to,
        cc,
        bcc,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error al enviar correo vía Resend API:", errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    return { success: true, id: data.id };
  } catch (error) {
    console.error("Error de red enviando correo:", error);
    return { success: false, error };
  }
}
