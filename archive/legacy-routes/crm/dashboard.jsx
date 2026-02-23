import { useUser } from "@supabase/auth-helpers-react";
import { Navigate } from "react-router-dom";

export default function Dashboard() {
  const user = useUser();
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p>Welcome {user.email}</p>
    </div>
  );
}
