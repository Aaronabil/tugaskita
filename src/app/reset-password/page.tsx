"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { gooeyToast } from "goey-toast";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (!password || !confirmPassword) {
      gooeyToast.error("Semua kolom wajib diisi");
      return;
    }

    if (password.length < 6) {
      gooeyToast.error("Password minimal 6 karakter");
      return;
    }

    if (password !== confirmPassword) {
      gooeyToast.error("Konfirmasi password tidak cocok");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Memperbarui password akun user yang sedang aktif sesi resetnya
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    setLoading(false);

    if (error) {
      gooeyToast.error(error.message);
      return;
    }

    setIsSuccess(true);
    gooeyToast.success("Password berhasil diperbarui!");

    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 2000);
  }

  return (
    <AuthShell
      title="Atur Ulang Password"
      subtitle="Silakan masukkan kata sandi baru untuk akun Anda."
      footer={
        <>
          Ingat kata sandi Anda?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Masuk
          </Link>
        </>
      }
    >
      {isSuccess ? (
        <div className="space-y-4 text-center py-4">
          <div className="flex justify-center text-primary">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">Password Berhasil Diubah</h3>
            <p className="text-sm text-muted-foreground">
              Kata sandi akun Anda telah diperbarui. Mengalihkan ke halaman login...
            </p>
          </div>
          <Button
            className="w-full mt-2"
            onClick={() => router.push("/login")}
          >
            Masuk Sekarang
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password Baru</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Minimal 6 karakter"
                autoComplete="new-password"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Ulangi password baru"
                autoComplete="new-password"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Menyimpan sandi baru..." : "Simpan Password Baru"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}