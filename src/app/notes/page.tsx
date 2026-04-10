import { getAnonClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NotesPage() {
  const supabase = await getAnonClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: notes, error } = await (supabase as any)
    .from("notes")
    .select("id,title,inserted_at");

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Supabase Notes</h1>
      {error && (
        <div className="rounded border border-red-600 bg-red-50 p-4 text-sm text-red-800">
          <strong>Error:</strong> {error.message}
        </div>
      )}
      <pre className="overflow-auto rounded bg-[color:var(--surface-2)] p-4 text-xs">
        {JSON.stringify(notes || [], null, 2)}
      </pre>
      <p className="text-xs text-slate-700 dark:text-slate-300">
        Table: public.notes • Rows: {(notes || []).length} • Live: {new Date().toLocaleTimeString()}
      </p>
    </div>
  );
}
