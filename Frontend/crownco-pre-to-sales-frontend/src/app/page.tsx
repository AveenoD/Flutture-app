import { redirect } from "next/navigation";

export default function Home() {
  redirect("/caller/dashboard");
}