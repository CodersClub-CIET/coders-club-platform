import { ManagementGuard } from "@/components/auth/management-guard";
import { AssociateAllocationGuard } from "@/components/auth/associate-allocation-guard";

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  return <ManagementGuard><AssociateAllocationGuard scope="event">{children}</AssociateAllocationGuard></ManagementGuard>;
}
