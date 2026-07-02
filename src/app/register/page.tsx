"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { gooeyToast } from "goey-toast";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const nama = String(form.get("nama") ?? "").trim();
    const nim = String(form.get("nim") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!nama || !nim || !email || !password) {
      gooeyToast.error("Semua kolom wajib diisi");
      return;
    }
    if (password.length < 6) {
      gooeyToast.error("Password minimal 6 karakter");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nama, nim, role: "member" } },
    });

    if (error) {
      setLoading(false);
      gooeyToast.error(
        error.message.includes("already")
          ? "Email sudah terdaftar"
          : error.message,
      );
      return;
    }

    // Bila konfirmasi email aktif, belum ada session.
    if (!data.session) {
      setLoading(false);
      gooeyToast.success("Akun dibuat! Cek email untuk verifikasi, lalu masuk.");
      router.push("/login");
      return;
    }

    gooeyToast.success(`Selamat datang, ${nama.split(" ")[0]}!`);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell
      title="Buat akun"
      subtitle="Daftar untuk mulai mengumpulkan tugas."
      footer={
        <>
          Sudah punya akun?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Masuk
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nama">Nama lengkap</Label>
          <Input id="nama" name="nama" placeholder="Budi Santoso" autoComplete="name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nim">NIM</Label>
          <Input id="nim" name="nim" placeholder="2110511001" inputMode="numeric" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="budi@kampus.ac.id" autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" placeholder="Minimal 6 karakter" autoComplete="new-password" />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          {loading ? "Membuat akun..." : "Daftar"}
        </Button>
      </form>
    </AuthShell>
  );
}
