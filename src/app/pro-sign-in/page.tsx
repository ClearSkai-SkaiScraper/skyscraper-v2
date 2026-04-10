import { SignIn } from "@clerk/nextjs";
// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProSignInPage() {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId } = await auth();

  // If already signed in, just send them to the app
  if (userId) {
    redirect("/dashboard");
  }

  // Otherwise, render the Clerk sign-in form
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="rounded-3xl bg-background/90 p-8 shadow-xl">
        <SignIn
          redirectUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-none",
            },
          }}
        />
      </div>
    </main>
  );
}
