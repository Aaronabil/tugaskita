"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { gooeyToast } from "goey-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Efek interval untuk countdown mundur
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  async function sendResetEmail(targetEmail: string) {
    setLoading(true);
    const supabase = createClient();
    const origin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "https://tugaskita-five.vercel.app";

    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);

    if (error) {
      gooeyToast.error(error.message);
      return;
    }

    setIsSubmitted(true);
    setCountdown(60); // Mulai hitung mundur 60 detik
    gooeyToast.success("Link reset password telah dikirim ke email!");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const inputEmail = String(form.get("email") ?? "").trim();

    if (!inputEmail) {
      gooeyToast.error("Masukkan email Anda");
      return;
    }

    setEmail(inputEmail);
    await sendResetEmail(inputEmail);
  }

  return (
    <AuthShell
      title="Lupa Password"
      subtitle={
        isSubmitted
          ? ""
          : "Masukkan email akun Anda untuk menerima tautan pemulihan kata sandi."
      }
      footer={
        <Link
          href="/login"
          className="inline-flex items-center gap-2 font-medium text-primary hover:underline text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke halaman masuk
        </Link>
      }
    >
      {isSubmitted ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Instruksi reset password telah dikirim ke{" "}
            <span className="font-medium text-foreground">{email}</span>. Silakan
            periksa kotak masuk atau folder spam email Anda.
          </p>
          <Button
            variant="outline"
            className="w-full"
            disabled={countdown > 0 || loading}
            onClick={() => sendResetEmail(email)}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {countdown > 0
              ? `Kirim ulang email (${countdown}s)`
              : "Kirim ulang email"}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="budi@kampus.ac.id"
              autoComplete="email"
              defaultValue={email}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Mengirim link..." : "Kirim Link Reset"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}