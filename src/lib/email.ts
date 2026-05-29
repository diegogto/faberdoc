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

  // Extraer enlaces del cuerpo HTML para facilitar la depuración
  const urlRegex = /href=["']([^"']+)["']/g;
  const links: string[] = [];
  let match;
  while ((match = urlRegex.exec(html)) !== null) {
    const url = match[1];
    if (!links.includes(url) && !url.includes("resend.com") && !url.startsWith("mailto:")) {
      links.push(url);
    }
  }

  // Extraer código OTP (6 dígitos consecutivos)
  const otpMatch = html.match(/\b\d{6}\b/);
  const otpCode = otpMatch ? otpMatch[0] : null;

  // Si no está configurada la API key de Resend o estamos en desarrollo sin ella,
  // logueamos el correo de forma simplificada y visualmente intuitiva.
  if (!apiKey || !apiKey.startsWith("re_")) {
    console.log("\n✉️  ================ [EMAIL LOG (MOCK MODE)] ================");
    console.log(`👉 Estado:      ⚠️ MOCK MODE (API Key no configurada o inválida)`);
    console.log(`👉 De:          Faberdoc <${fromEmail}>`);
    console.log(`👉 Para:        ${to}`);
    if (cc) console.log(`👉 CC:          ${JSON.stringify(cc)}`);
    if (bcc) console.log(`👉 BCC:         ${JSON.stringify(bcc)}`);
    console.log(`👉 Asunto:      ${subject}`);
    if (otpCode) {
      console.log(`👉 Código OTP:  🔑 ${otpCode}`);
    }
    if (links.length > 0) {
      console.log(`👉 Enlaces:`);
      links.forEach(link => console.log(`   🔗 ${link}`));
    }
    console.log(`👉 Cuerpo:      HTML de ${html.length} caracteres (cuerpo completo omitido)`);
    console.log("========================================================\n");
    return { success: true, mock: true };
  }

  // Si se está intentando enviar vía Resend API, mostramos un log de inicio claro y limpio
  console.log("\n✉️  ============= [ENVIANDO CORREO VÍA RESEND] =============");
  console.log(`👉 De:          Faberdoc <${fromEmail}>`);
  console.log(`👉 Para:        ${to}`);
  console.log(`👉 Asunto:      ${subject}`);
  if (otpCode) {
    console.log(`👉 Código OTP:  🔑 ${otpCode}`);
  }
  if (links.length > 0) {
    console.log(`👉 Enlaces:`);
    links.forEach(link => console.log(`   🔗 ${link}`));
  }
  console.log("========================================================\n");

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
      let detailedError = errorText;
      try {
        const parsedError = JSON.parse(errorText);
        detailedError = `${parsedError.name || "Error"}: ${parsedError.message || errorText}`;
      } catch {
        // No es JSON válido
      }

      console.error("\n❌ ERROR AL ENVIAR CORREO VÍA RESEND API:");
      console.error(`👉 Status:      ${response.status} ${response.statusText}`);
      console.error(`👉 Detalle:     ${detailedError}`);
      console.error(`👉 Para:        ${to}`);
      console.error("========================================================\n");
      
      return { success: false, error: detailedError };
    }

    const data = await response.json();
    console.log(`\n✅ Correo enviado con éxito. Resend ID: ${data.id}\n`);
    return { success: true, id: data.id };
  } catch (error) {
    console.error("\n❌ ERROR DE RED ENVIANDO CORREO:");
    console.error(`👉 Error:       `, error);
    console.error("========================================================\n");
    return { success: false, error };
  }
}
