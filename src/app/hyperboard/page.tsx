import { redirect } from "next/navigation";
import { type Metadata } from "next";
import { auth } from "~/server/auth";
import { HyperboardPlaygroundClient } from "./HyperboardPlaygroundClient";

export const metadata: Metadata = {
  title: "Hyperboard Playground | Impactful Events",
  description:
    "Configure and preview Hyperboard visualizations with interactive controls",
};

export default async function HyperboardPlaygroundPage() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin");
  }

  return <HyperboardPlaygroundClient />;
}
