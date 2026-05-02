import { redirect } from "next/navigation";

export default function Home() {
  // TODO: check auth state, redirect to login if not authenticated
  redirect("/dashboard");
}
