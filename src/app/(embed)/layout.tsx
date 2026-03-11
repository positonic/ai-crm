import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule",
  description: "Event schedule embed",
};

export default function EmbedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
