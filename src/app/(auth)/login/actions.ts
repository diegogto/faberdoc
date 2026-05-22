"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getRequestOrigin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

export async function loginAction(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Supabase Auth Login Error:", {
      message: error.message,
      status: error.status,
      name: error.name,
    });
    redirect("/login?error=credentials");
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signupAction(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) {
    console.error("Supabase Auth Signup Error:", {
      message: error.message,
      status: error.status,
      name: error.name,
    });
    redirect("/register?error=signup");
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestResetPasswordAction(formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) {
    redirect("/forgot-password?error=request-failed");
  }

  try {
    const adminSupabase = createAdminClient();
    const origin = await getRequestOrigin();

    // 1. Generar enlace de recuperación en Supabase
    const { data, error } = await adminSupabase.auth.admin.generateLink({
      type: "recovery",
      email: email,
      options: {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      },
    });

    if (error || !data?.properties?.action_link || !data?.properties?.email_otp) {
      console.error("Supabase Admin Generate Recovery Link Error:", error);
      redirect("/forgot-password?error=request-failed");
    }

    const actionLink = data.properties.action_link;
    const otpCode = data.properties.email_otp;

    // 2. Enviar el correo personalizado usando Resend
    const emailContent = `
      <h2>Restablecer tu contraseña en Faberdoc</h2>
      <p>Hola,</p>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta asociada al correo <strong>${email}</strong>.</p>
      <p>Puedes restablecer tu contraseña haciendo clic en el siguiente enlace:</p>
      <p style="margin: 20px 0;">
        <a href="${actionLink}" style="display:inline-block;background-color:#0f172a;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Restablecer Contraseña</a>
      </p>
      <p>O ingresando el siguiente código de 6 dígitos en la página de verificación:</p>
      <h3 style="background-color:#f1f5f9;display:inline-block;padding:10px 20px;border-radius:6px;font-family:monospace;font-size:24px;letter-spacing:4px;margin:10px 0;">${otpCode}</h3>
      <p style="word-break: break-all; font-size:12px; color:#64748b; margin-top:20px;">
        Enlace directo:<br />
        <a href="${actionLink}">${actionLink}</a>
      </p>
      <p style="font-size:12px;color:#64748b;margin-top:20px;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu contraseña seguirá siendo la misma.</p>
    `;

    const emailResult = await sendEmail({
      to: email,
      subject: "Restablecer contraseña - Faberdoc",
      html: emailContent,
    });

    if (!emailResult.success) {
      console.error("Error sending custom recovery email via Resend:", emailResult.error);
      redirect("/forgot-password?error=request-failed");
    }

    redirect(`/forgot-password/verify?email=${encodeURIComponent(email)}`);
  } catch (err) {
    console.error("Unexpected error in requestResetPasswordAction:", err);
    redirect("/forgot-password?error=request-failed");
  }
}

export async function verifyOtpAction(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const token = formData.get("token") as string;

  if (!email || !token) {
    redirect(`/forgot-password/verify?email=${encodeURIComponent(email)}&error=invalid-fields`);
  }

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "recovery",
  });

  if (error) {
    console.error("Supabase Auth Verify OTP Error:", {
      message: error.message,
      status: error.status,
    });
    redirect(`/forgot-password/verify?email=${encodeURIComponent(email)}&error=invalid-code`);
  }

  revalidatePath("/", "layout");
  redirect("/reset-password");
}

export async function resetPasswordAction(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    console.error("Supabase Auth Update Password Error:", {
      message: error.message,
      status: error.status,
    });
    redirect("/reset-password?error=reset-failed");
  }

  revalidatePath("/", "layout");
  redirect("/login?success=password-reset");
}


