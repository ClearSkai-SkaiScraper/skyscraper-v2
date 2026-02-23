import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function IndexRoute() {
  const navigate = useNavigate();
  const user = useUser();
  const supabase = useSupabaseClient();

  useEffect(() => {
    if (user) {
      navigate("/crm/dashboard");
    } else {
      navigate("/auth");
    }
  }, [user]);

  return null;
}
