/* eslint-disable react/jsx-no-comment-textnodes, @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ClaimWeatherSection({ weatherReports }: any) {
  if (!weatherReports?.length) {
    return (
      <div className="rounded bg-gray-50 p-6">
        <h2 className="text-xl font-semibold">Weather Reports</h2>
        <p className="mt-2 text-gray-600">No weather intelligence yet.</p>
        <a
          href="/weather/new"
          className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-white"
        >
          Generate Weather Intel →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      // eslint-disable-next-line react/jsx-no-comment-textnodes
      <h2 className="text-xl font-semibold">Weather Reports</h2>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {weatherReports.map((r: any) => (
        <a
          key={r.id}
          href={`/weather/${r.id}`}
          className="block rounded bg-white p-4 shadow hover:bg-blue-50"
        >
          <div className="font-semibold text-blue-700">
            Weather Report — {r.primaryPeril || r.peril}
          </div>
          <div className="text-sm text-gray-600">
            Generated: {new Date(r.createdAt).toLocaleString()}
          </div>
        </a>
      ))}
    </div>
  );
}
