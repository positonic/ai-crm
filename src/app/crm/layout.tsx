import "./crm.css";
import CRMSidebar from "./CRMSidebar";

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="crm-layout">
      <CRMSidebar />
      <main className="crm-content">{children}</main>
    </div>
  );
}
