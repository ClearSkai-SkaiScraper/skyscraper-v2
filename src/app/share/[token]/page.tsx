import { notFound } from "next/navigation";

/**
 * TODO: Look up token in DB:
 * select * from share_tokens where token=$1 and now()<expires_at
 * Then load underlying resource (report/export) and render.
 */
export default async function ShareView({ params }: { params: { token: string } }) {
  const { token } = params;

  // const row = await db.query(...token...);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = { resource_type: "report", resource_id: "demo", expires_at: "2099-01-01" } as any; // mock

  if (!row) return notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-4 text-2xl font-semibold">Shared {row.resource_type}</h1>
      <div className="rounded-xl border p-6">
        {/* TODO: render report/export by resource_id */}
        This is a public, read-only share. Token: <code>{token}</code>
      </div>
    </main>
  );
}
