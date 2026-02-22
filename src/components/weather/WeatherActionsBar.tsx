"use client";

export default function ReportActionsBar({ reportId }: any) {
  async function sendEmail() {
    const res = await fetch("/api/weather/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });

    if (res.ok) {
      alert("Email sent to adjuster!");
    } else {
      alert("Failed to send email");
    }
  }

  async function addToIntelCore() {
    await fetch("/api/intelligence/add-weather", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    alert("Weather added to Intelligence Core");
  }

  async function addToSupplement() {
    await fetch("/api/supplements/add-weather", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    alert("Weather highlights added to supplement builder");
  }

  async function downloadPDF() {
    const res = await fetch("/api/weather/export-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob));
  }

  async function sharePublic() {
    const res = await fetch("/api/weather/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId }),
    });
    const data = await res.json();
    navigator.clipboard.writeText(data.url);
    alert("Public share link copied to clipboard!");
  }

  return (
    <div className="flex flex-wrap gap-4 border-b pb-4">
      <button
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        onClick={downloadPDF}
      >
        📄 Download PDF
      </button>
      <button
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        onClick={sendEmail}
      >
        ✉️ Email to Adjuster
      </button>
      <button
        className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
        onClick={addToIntelCore}
      >
        🧠 Add to Intelligence Packet
      </button>
      <button
        className="rounded bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
        onClick={addToSupplement}
      >
        ➕ Add to Supplement Builder
      </button>
      <button
        className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
        onClick={sharePublic}
      >
        🔗 Share Public Link
      </button>
    </div>
  );
}
