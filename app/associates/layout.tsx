import { ManagementGuard } from "@/components/auth/management-guard";
import { ALLOCATION_MANAGEMENT_ROLES } from "@/lib/auth/access";

export default function AssociateManagementLayout({ children }: { children: React.ReactNode }) {
  return <ManagementGuard allowedRoles={ALLOCATION_MANAGEMENT_ROLES}>{children}</ManagementGuard>;
}
