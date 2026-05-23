"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getRequestOrigin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { getRecoveryEmailHtml } from "@/lib/email-templates";

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
  const confirmPassword = formData.get("confirm_password") as string;
  const fullName = formData.get("full_name") as string;

  if (password !== confirmPassword) {
    redirect("/register?error=password-mismatch");
  }

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

  let redirectToPath = "";

  try {
    const adminSupabase = createAdminClient();
    const origin = await getRequestOrigin();

    // 1. Generar enlace de recuperación en Supabase
    const { data, error } = await adminSupabase.auth.admin.generateLink({
      type: "recovery",
      email: email,
    });

    if (error || !data?.properties?.hashed_token || !data?.properties?.email_otp) {
      console.error("Supabase Admin Generate Recovery Link Error:", error);
      redirectToPath = "/forgot-password?error=request-failed";
    } else {
      const hashedToken = data.properties.hashed_token;
      const otpCode = data.properties.email_otp;
      
      // Enlace que apunta directamente a nuestro Route Handler confirm
      const customActionLink = `${origin}/auth/confirm?token_hash=${hashedToken}&type=recovery&next=/reset-password`;

      // 2. Enviar el correo personalizado usando Resend
      const emailContent = getRecoveryEmailHtml(email, customActionLink, otpCode);

      const emailResult = await sendEmail({
        to: email,
        subject: "Restablecer contraseña - Faberdoc",
        html: emailContent,
      });

      if (!emailResult.success) {
        console.error("Error sending custom recovery email via Resend:", emailResult.error);
        redirectToPath = "/forgot-password?error=request-failed";
      } else {
        redirectToPath = `/forgot-password/verify?email=${encodeURIComponent(email)}`;
      }
    }
  } catch (err) {
    console.error("Unexpected error in requestResetPasswordAction:", err);
    redirectToPath = "/forgot-password?error=request-failed";
  }

  if (redirectToPath) {
    redirect(redirectToPath);
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
  const confirmPassword = formData.get("confirm_password") as string;

  if (password !== confirmPassword) {
    redirect("/reset-password?error=password-mismatch");
  }

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


