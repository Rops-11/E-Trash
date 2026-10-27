import { redirect } from "next/navigation";
import { signedIn } from "../lib/auth";
import Monitor from "./monitor";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!(await signedIn())) redirect("/login");
  return <Monitor />;
}
