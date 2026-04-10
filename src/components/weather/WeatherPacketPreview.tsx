"use client";

interface WeatherPacketPreviewProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  packet: any;
}

export function WeatherPacketPreview({ packet }: WeatherPacketPreviewProps) {
  if (!packet) {
    return (
      <div className="py-8 text-center text-gray-500">
        <p className="text-sm">No packet data available</p>
      </div>
    );
  }

  const { format } = packet;

  // Render based on format
  if (format === "CLAIMS") {
    return <ClaimsPacketView packet={packet} />;
  }

  if (format === "HOMEOWNER") {
    return <HomeownerPacketView packet={packet} />;
  }

  if (format === "QUICK") {
    return <QuickPacketView packet={packet} />;
  }

  if (format === "PA") {
    return <PAPacketView packet={packet} />;
  }

  return null;
}

// Claims-Ready Packet View
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ClaimsPacketView({ packet }: { packet: any }) {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">{packet.title}</h1>
        <p className="text-sm text-gray-600">{packet.subtitle}</p>
        <div className="mt-2 flex gap-4 text-xs text-gray-500">
          <span>Date of Loss: {packet.dateOfLoss}</span>
          <span>Severity: {packet.severity}</span>
          <span>Confidence: {packet.confidenceLevel}</span>
        </div>
      </div>

      <Section title="Storm Summary">
        <p className="text-sm">{packet.stormSummary}</p>
      </Section>

      {packet.hail?.detected && (
        <Section title="🌩️ Hail Analysis">
          <DataGrid data={packet.hail} />
        </Section>
      )}

      {packet.wind?.detected && (
        <Section title="🌬️ Wind Analysis">
          <DataGrid data={packet.wind} />
        </Section>
      )}

      {packet.rain?.detected && (
        <Section title="☔ Precipitation Analysis">
          <DataGrid data={packet.rain} />
        </Section>
      )}

      <Section title="📡 Radar Summary">
        <p className="text-sm">{packet.radar?.summary}</p>
      </Section>

      <Section title="📚 Building Code References">
        <DataGrid data={packet.codeReferences} />
      </Section>

      <Section title="📋 Conclusions">
        <ul className="list-inside list-disc space-y-1 text-sm">
          {packet.conclusions?.map((c: string, i: number) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

// Homeowner Packet View
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HomeownerPacketView({ packet }: { packet: any }) {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">{packet.title}</h1>
        <p className="text-sm text-gray-600">{packet.subtitle}</p>
        <p className="mt-2 text-sm">{packet.intro}</p>
      </div>

      <div className="rounded-xl bg-blue-50 p-4">
        <p className="text-sm">{packet.simpleSummary}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-2xl">{packet.riskEmoji}</span>
          <span className="text-sm font-medium">Risk Level: {packet.riskLevel}</span>
        </div>
      </div>

      <Section title="Key Takeaways">
        <ul className="list-inside list-disc space-y-1 text-sm">
          {packet.bigTakeaways?.map((t: string, i: number) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </Section>

      <Section title="What This Means for You">
        <ul className="list-inside list-disc space-y-1 text-sm">
          {packet.whatThisMeans?.map((m: string, i: number) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      </Section>

      <Section title="Next Steps">
        <ol className="list-inside list-decimal space-y-1 text-sm">
          {packet.nextSteps?.map((step: string, i: number) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </Section>

      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
        <h3 className="mb-2 text-sm font-semibold">Safety Notes</h3>
        <ul className="space-y-1 text-xs">
          {packet.safetyNotes?.map((note: string, i: number) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Quick Snapshot View
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function QuickPacketView({ packet }: { packet: any }) {
  return (
    <div className="space-y-4">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">{packet.title}</h1>
        <p className="text-sm text-gray-600">{packet.subtitle}</p>
      </div>

      <div className="rounded-xl bg-gray-50 p-4">
        <h3 className="mb-2 text-sm font-semibold">Summary</h3>
        <ul className="space-y-1 text-sm">
          {packet.bulletSummary?.map((bullet: string, i: number) => (
            <li key={i}>• {bullet}</li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-blue-50 p-3">
          <p className="text-xs text-gray-600">Hail</p>
          <p className="text-sm font-semibold">
            {packet.quickFacts?.hailDetected ? "✅ Detected" : "❌ Not Detected"}
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 p-3">
          <p className="text-xs text-gray-600">Wind</p>
          <p className="text-sm font-semibold">
            {packet.quickFacts?.windDetected ? "✅ Detected" : "❌ Not Detected"}
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 p-3">
          <p className="text-xs text-gray-600">Rain</p>
          <p className="text-sm font-semibold">
            {packet.quickFacts?.rainDetected ? "✅ Detected" : "❌ Not Detected"}
          </p>
        </div>
        <div className="rounded-lg bg-blue-50 p-3">
          <p className="text-xs text-gray-600">Snow</p>
          <p className="text-sm font-semibold">
            {packet.quickFacts?.snowDetected ? "✅ Detected" : "❌ Not Detected"}
          </p>
        </div>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm font-medium">{packet.conclusion}</p>
      </div>
    </div>
  );
}

// Public Adjuster Forensic View
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PAPacketView({ packet }: { packet: any }) {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-red-700">{packet.title}</h1>
        <p className="text-sm text-gray-600">{packet.subtitle}</p>
        <div className="mt-2 flex gap-4 text-xs text-gray-500">
          <span>Date of Loss: {packet.dateOfLoss}</span>
          <span>Severity: {packet.severityScore}</span>
          <span>Confidence: {packet.confidenceLevel}</span>
        </div>
      </div>

      <Section title="Executive Summary">
        <p className="text-sm">{packet.stormSummary}</p>
      </Section>

      {packet.hail?.detected && (
        <Section title="🌩️ Hail Forensic Analysis">
          <DataGrid data={packet.hail} />
        </Section>
      )}

      {packet.wind?.detected && (
        <Section title="🌬️ Wind Forensic Analysis">
          <DataGrid data={packet.wind} />
        </Section>
      )}

      <Section title="📚 Building Code Implications">
        <DataGrid data={packet.codeImplications} />
      </Section>

      <Section title="🔬 Component Analysis">
        <DataGrid data={packet.componentAnalysis} />
      </Section>

      <Section title="⚖️ Litigation Support Notes">
        <ul className="list-inside list-disc space-y-1 text-sm">
          {packet.litigationNotes?.map((note: string, i: number) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      </Section>

      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <h3 className="mb-2 text-sm font-semibold">Expert Opinion</h3>
        <p className="text-xs">{packet.expertOpinion}</p>
      </div>

      <Section title="📋 Conclusions">
        <ul className="list-inside list-disc space-y-1 text-sm">
          {packet.conclusions?.map((c: string, i: number) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

// Helper Components
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      {children}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DataGrid({ data }: { data: Record<string, any> }) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex justify-between border-b py-2 text-xs">
          <span className="font-medium text-gray-600">
            {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}:
          </span>
          <span className="text-gray-900">{String(value)}</span>
        </div>
      ))}
    </div>
  );
}
