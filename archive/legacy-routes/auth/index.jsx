import { useSupabaseClient } from "@supabase/auth-helpers-react";

export default function AuthPage() {
  const supabase = useSupabaseClient();

  async function signInWithEmail() {
    const email = prompt("Enter email:");
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert("Check your email for magic login link!");
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center text-center">
      <h1 className="mb-6 text-3xl font-bold">SkaiScraper™ Login</h1>
      <button className="rounded-lg bg-blue-600 px-6 py-3 text-white" onClick={signInWithEmail}>
        Send Magic Link
      </button>
    </div>
  );
}
