"use client";

import { useTransition } from "react";
import { requestResetPasswordAction } from "../login/actions";
import { Loader2 } from "lucide-react";

export default function ForgotPasswordFormClient() {
  const [isPending, startTransition] = useTransition();

  const actionHandler = (formData: FormData) => {
    startTransition(async () => {
      await requestResetPasswordAction(formData);
    });
  };

  return (
    <form action={actionHandler} className="space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-sm font-medium text-foreground"
        >
          Email corporativo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          disabled={isPending}
          placeholder="correo@empresa.com"
          className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-all disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-md shadow-primary/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : (
          "Enviar enlace de recuperación"
        )}
      </button>
    </form>
  );
}
