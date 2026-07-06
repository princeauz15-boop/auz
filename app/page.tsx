import { redirect } from "next/navigation";
import { getSessionFromHeaders } from "@/lib/session";

export default async function Home() {
  const session = await getSessionFromHeaders();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "admin") {
    redirect("/admin/dashboard");
  } else {
    redirect("/employee/dashboard");
  }
}
