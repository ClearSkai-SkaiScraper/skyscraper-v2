import useSWR from "swr";

type OrgActiveResponse = {
  data: { id: string; name: string; role: string } | null;
  status: number;
  error?: string | null;
};

const fetcher = async (url: string): Promise<OrgActiveResponse> => {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // No JSON body
  }
  return {
    data: res.ok ? (json as { id: string; name: string; role: string }) : null,
    status: res.status,
    error: res.ok ? null : (json?.error ?? "Unauthorized"),
  };
};

export function useActiveOrg() {
  const { data, error, isLoading } = useSWR<OrgActiveResponse>("/api/org/active", fetcher, {
    shouldRetryOnError: false,
  });

  const unauthenticated = data?.status === 401;
  const needsOrgSetup = data?.status === 404;

  return {
    org: data?.data ?? null,
    isLoading,
    error: error ?? data?.error ?? null,
    status: data?.status ?? 0,
    unauthenticated,
    needsOrgSetup,
  };
}
