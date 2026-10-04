import Link from "next/link";
import { QrCode, ArrowRight, ShieldCheck, Users, GraduationCap } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col justify-center items-center p-6 sm:p-12">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-8 sm:p-12 shadow-xl border border-gray-100 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
          <QrCode className="h-9 w-9" />
        </div>

        <h1 className="mt-6 text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
          Coders Club Attendance Platform
        </h1>

        <p className="mt-3 text-base text-gray-600 max-w-xl mx-auto">
          Server-authoritative Dynamic QR attendance with anti-replay challenge rotation, duplicate prevention, and real-time validation.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <Link
            href="/dynamic-qr"
            className="group rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <GraduationCap className="h-5 w-5" />
              </span>
              <ArrowRight className="h-5 w-5 text-indigo-500 transition-transform group-hover:translate-x-1" />
            </div>
            <h3 className="mt-4 font-bold text-gray-900 text-lg">Launch Dynamic QR</h3>
            <p className="mt-1 text-xs text-gray-600">
              Start attendance sessions for Students or Associates with live countdown and scannable QR display.
            </p>
          </Link>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
            </div>
            <h3 className="mt-4 font-bold text-gray-900 text-lg">Security & Anti-Replay</h3>
            <p className="mt-1 text-xs text-gray-600">
              Opaque cryptographic tokens, atomic single-use consumption, and server-side duplicate checks.
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-indigo-600" /> Student & Associate QR
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-indigo-600" /> Server Authoritative
          </span>
          <span className="flex items-center gap-1.5">
            <QrCode className="h-4 w-4 text-indigo-600" /> Google Lens & Camera Ready
          </span>
        </div>
      </div>
    </main>
  );
}