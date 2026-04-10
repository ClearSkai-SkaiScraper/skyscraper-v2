import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ClientLandingPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/client/sign-in");
  }

  // If you later add a slug in metadata, you can redirect here.
  // For now, keep it simple and stable:
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <section className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16">
        <h1 className="text-3xl font-semibold">Welcome to the SkaiScraper Client Portal</h1>
        <p className="text-slate-300">
          Your account is set up, but your personalized project space isn&apos;t configured yet.
        </p>
        <p className="text-slate-400">
          Check your email for a link from your contractor, or contact support if you believe this
          is a mistake.
        </p>
      </section>
    </main>
  );
}
