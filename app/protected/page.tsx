import { LogoutButton } from "@/components/auth/logout-button";

export default function ProtectedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">
        Protected Area
      </h1>

      <LogoutButton />
    </main>
  );
}