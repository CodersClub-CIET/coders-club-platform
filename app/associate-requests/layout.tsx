import { ManagementGuard } from "@/components/auth/management-guard";

export default function AssociateRequestsLayout({ children }: { children: React.ReactNode }) {
  return <ManagementGuard allowedRoles={["admin"]}>{children}</ManagementGuard>;
}
