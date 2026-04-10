/* eslint-disable react/jsx-no-comment-textnodes, no-restricted-syntax */
export default function DevDashboard() {
  return (
    <div className="p-10 font-mono">
      <h1 className="text-green-600">✅ DEV DASHBOARD</h1>
      <p>No auth. No org. No layout. No guards.</p>
      <p>Build: {process.env.VERCEL_GIT_COMMIT_SHA || "LOCAL"}</p>
      <p>Time: {new Date().toISOString()}</p>
      <p>Node: {process.version}</p>
      <p>Env: {process.env.NODE_ENV}</p>
    </div>
  );
}
