// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function ClaimCorrelationSection({ correlation }: any) {
  if (!correlation) {
    return (
      <div className="rounded bg-gray-50 p-6">
        <h2 className="text-xl font-semibold">Damage–Weather Correlation</h2>
        <p className="mt-2 text-gray-600">No forensic correlation generated yet.</p>
        <a
          href="/correlate/new"
          className="mt-4 inline-block rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
        >
          Generate Forensic Correlation →
        </a>
      </div>
    );
  }

  const c = correlation.payload || correlation;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold">Damage–Weather Correlation</h2>

      <SummaryCard title="Summary" text={c.summary} />

      <LikelihoodBlock title="🧊 Hail Causation" data={c.hailCorrelation} />
      <LikelihoodBlock title="🌬️ Wind Causation" data={c.windCorrelation} />
      <LikelihoodBlock title="🌧️ Rain/Leak Causation" data={c.rainLeakCorrelation} />
      <LikelihoodBlock title="❄️ Freeze/Thaw Causation" data={c.freezeThawCorrelation} />

      <section className="rounded border-l-4 border-blue-600 bg-blue-50 p-6 shadow">
        <h3 className="mb-2 text-xl font-semibold">⏱️ Timeline Match</h3>
        <div className="mb-3 text-3xl font-bold text-blue-700">{c.timelineMatch.score}%</div>
        <p className="text-gray-700">{c.timelineMatch.explanation}</p>
      </section>

      <section className="rounded border-l-4 border-green-600 bg-green-50 p-6 shadow">
        <h3 className="mb-3 text-xl font-semibold">✅ Final Causation Conclusion</h3>
        <p className="leading-relaxed text-gray-800">{c.finalCausationConclusion}</p>
      </section>

      <section className="rounded bg-white p-6 shadow">
        <h3 className="mb-3 text-xl font-semibold">📋 Recommendations</h3>
        // eslint-disable-next-line react/jsx-no-comment-textnodes
        <ul className="ml-6 list-disc space-y-2">
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {c.recommendations?.map((r: any, i: number) => (
            <li key={i} className="text-gray-700">{r}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SummaryCard({ title, text }: any) {
  return (
    <section className="rounded bg-white p-6 shadow">
      <h3 className="mb-3 text-xl font-semibold">{title}</h3>
      <p className="leading-relaxed text-gray-700">{text}</p>
    </section>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LikelihoodBlock({ title, data }: any) {
  if (!data) return null;

  const getColorClass = (likelihood: number) => {
    if (likelihood >= 80) return "text-green-600";
    if (likelihood >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getBgClass = (likelihood: number) => {
    if (likelihood >= 80) return "bg-green-50 border-green-600";
    if (likelihood >= 50) return "bg-yellow-50 border-yellow-600";
    return "bg-red-50 border-red-600";
  };

  return (
    <section className={`rounded border-l-4 p-6 shadow ${getBgClass(data.likelihood)}`}>
      <h3 className="mb-3 text-xl font-semibold">{title}</h3>
      <div className={`mb-4 text-4xl font-bold ${getColorClass(data.likelihood)}`}>
        {data.likelihood}% Likelihood
      </div>
      <p className="mb-4 leading-relaxed text-gray-700">{data.explanation}</p>

      {data.evidence?.length > 0 && (
        <div>
          <h4 className="mb-2 font-semibold text-gray-800">Evidence:</h4>
          // eslint-disable-next-line react/jsx-no-comment-textnodes
          <ul className="ml-6 list-disc space-y-1">
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {data.evidence.map((e: any, i: number) => (
              <li key={i} className="text-gray-600">{e}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
