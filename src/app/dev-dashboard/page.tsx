export default function DevDashboard() {
  return (
    <div className="p-10 font-mono">
      <h1 className="text-green-600">✅ DEV DASHBOARD</h1>
      // eslint-disable-next-line react/jsx-no-comment-textnodes
      <p>No auth. No org. No layout. No guards.</p>
      // eslint-disable-next-line no-restricted-syntax
      <p>Build: {process.env.VERCEL_GIT_COMMIT_SHA || "LOCAL"}</p>
      <p>Time: {new Date().toISOString()}</p>
      // eslint-disable-next-line react/jsx-no-comment-textnodes
      <p>Node: {process.version}</p>
      // eslint-disable-next-line no-restricted-syntax
      <p>Env: {process.env.NODE_ENV}</p>
    </div>
  );
}
