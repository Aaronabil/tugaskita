import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    // Ambil parameter next jika ada, default ke dashboard
    const next = searchParams.get("next") ?? "/dashboard";

    if (code) {
        const supabase = await createClient();
        // Tukar kode auth Supabase menjadi active session
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // Jika kode invalid / kadaluarsa
    return NextResponse.redirect(`${origin}/login?error=InvalidAuthCode`);
}