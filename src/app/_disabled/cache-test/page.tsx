export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default function CacheBusterTest() {
  const now = new Date();
  const timestamp = now.toISOString();
  const random = Math.random().toString(36).substring(2, 15);
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-8 text-white">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="mb-4 animate-pulse text-6xl font-black text-red-500">
            🚨 CACHE TEST 🚨
          </h1>
          <p className="mb-8 text-2xl text-yellow-400">
            If you see different values on refresh, new code IS deploying
          </p>
        </div>
        
        <div className="space-y-6 rounded-2xl border-4 border-red-500 bg-gray-900 p-8">
          <div className="grid grid-cols-2 gap-4 font-mono text-xl">
            <div className="text-gray-600 dark:text-gray-400">Server Timestamp:</div>
            <div className="font-bold text-green-400">{timestamp}</div>
            
            <div className="text-gray-600 dark:text-gray-400">Random Token:</div>
            <div className="font-bold text-blue-400">{random}</div>
            
            <div className="text-gray-600 dark:text-gray-400">Unix Time:</div>
            <div className="font-bold text-purple-400">{now.getTime()}</div>
            
            <div className="text-gray-600 dark:text-gray-400">Readable:</div>
            <div className="font-bold text-orange-400">{now.toLocaleString()}</div>
          </div>
        </div>
        
        <div className="rounded-xl border-2 border-yellow-500 bg-yellow-900 p-6">
          <h2 className="mb-4 text-2xl font-bold text-yellow-300">Instructions:</h2>
          <ol className="list-inside list-decimal space-y-2 text-lg">
            <li>Take a screenshot of this page NOW</li>
            <li>Hard refresh (Cmd+Shift+R or Ctrl+Shift+F5)</li>
            <li>Compare the timestamps</li>
            <li>If they&apos;re DIFFERENT = Code is deploying ✅</li>
            <li>If they&apos;re THE SAME = Cache problem ❌</li>
          </ol>
        </div>
        
        <div className="space-x-4 text-center">
          <a href="/dashboard" className="inline-block rounded-xl bg-blue-600 px-8 py-4 text-xl font-bold hover:bg-blue-700">
            Go to Dashboard
          </a>
          <a href="/claims" className="inline-block rounded-xl bg-green-600 px-8 py-4 text-xl font-bold hover:bg-green-700">
            Go to Claims
          </a>
          <a href="/leads" className="inline-block rounded-xl bg-purple-600 px-8 py-4 text-xl font-bold hover:bg-purple-700">
            Go to Leads
          </a>
        </div>
      </div>
    </div>
  );
}
