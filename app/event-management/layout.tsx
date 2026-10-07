import { ManagementGuard } from "@/components/auth/management-guard";

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  return <ManagementGuard>{children}</ManagementGuard>;
}
