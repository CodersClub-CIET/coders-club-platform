"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { AttendanceSession, QRTokenData } from "@/lib/attendance/types";
import { attendanceService } from "@/lib/attendance/attendance-service";
import { Button } from "@/components/ui/button";
import {
  Check,
  Copy,
  ExternalLink,
  QrCode,
  X,
  Clock,
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

interface QRDisplayModalProps {
  session: AttendanceSession;
  onClose: () => void;
}

export default function QRDisplayModal({ session, onClose }: QRDisplayModalProps) {
  const [qrData, setQrData] = useState<QRTokenData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300); // 5 minutes

  const loadQR = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await attendanceService.generateSessionQR(session.id);
      setQrData(data);

      const url = await QRCode.toDataURL(data.scanUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: "#0f172a", // slate-900
          light: "#ffffff",
        },
        errorCorrectionLevel: "M",
      });

      setQrDataUrl(url);
      setSecondsRemaining(300); // Reset countdown to 5 minutes
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate QR code.");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQR();
  }, [session.id]);

  // 5-minute live countdown timer
  useEffect(() => {
    if (!qrData || secondsRemaining <= 0) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [qrData, secondsRemaining]);

  const handleCopy = () => {
    if (!qrData?.scanUrl) return;
    navigator.clipboard.writeText(qrData.scanUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isExpired = secondsRemaining <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <QrCode className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Attendance QR Code</h2>
              <p className="text-xs text-slate-500 font-mono">Session ID: {session.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center text-center">
          {/* Session Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
              {session.eventName}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                session.period === "morning"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {session.period} Period
            </span>
            {session.subEventName && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                {session.subEventName}
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-1">{session.sessionName}</h3>
          <p className="text-xs text-slate-500 max-w-sm mb-4">
            Scan using default mobile camera or Google Lens. Valid for 5 minutes.
          </p>

          {/* QR Display Card */}
          <div className="relative p-4 bg-white rounded-2xl border-2 border-dashed border-indigo-200 shadow-inner flex items-center justify-center min-h-[340px] min-w-[340px]">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="size-10 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Generating secure 5-minute QR token...</p>
              </div>
            ) : error ? (
              <div className="text-center p-4">
                <p className="text-xs font-semibold text-rose-600 mb-2">{error}</p>
                <Button variant="outline" size="sm" onClick={loadQR}>
                  Try Again
                </Button>
              </div>
            ) : isExpired ? (
              <div className="flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                <div className="p-3 rounded-full bg-amber-50 text-amber-600 border border-amber-200 mb-3">
                  <AlertTriangle className="size-8" />
                </div>
                <h4 className="text-base font-bold text-slate-800">QR Code Expired</h4>
                <p className="text-xs text-slate-500 max-w-xs mt-1 mb-4">
                  The 5-minute validity window has expired. Generate a fresh QR code to allow students to continue scanning.
                </p>
                <Button
                  type="button"
                  onClick={loadQR}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5"
                >
                  <RotateCcw className="size-3.5" />
                  Generate Fresh 5-Min QR
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="Attendance Session QR"
                  className="size-72 rounded-xl shadow-sm"
                />
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-medium">
                    <ShieldCheck className="size-3.5 text-emerald-600" />
                    5-Minute Temporary Token
                  </span>
                  <button
                    type="button"
                    onClick={loadQR}
                    className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                    title="Refresh QR token"
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Security & 5-Minute Countdown Info */}
          <div className="w-full mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-left">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <Clock className="size-3.5 text-indigo-600" />
                QR Validity:
                <span
                  className={`font-mono font-bold ${
                    isExpired
                      ? "text-rose-600"
                      : secondsRemaining <= 60
                      ? "text-rose-500 animate-pulse"
                      : "text-indigo-600"
                  }`}
                >
                  {isExpired ? "EXPIRED" : `${formatTime(secondsRemaining)} remaining`}
                </span>
              </span>
              <span className="text-slate-400 font-mono text-[10px]">No high-frequency rotation</span>
            </div>

            {/* Link Copy Box */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={qrData?.scanUrl || ""}
                className="w-full text-[11px] font-mono bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 truncate focus:outline-none"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!qrData?.scanUrl || isExpired}
                className="shrink-0 text-xs"
              >
                {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              {qrData?.scanUrl && !isExpired && (
                <a
                  href={qrData.scanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                  title="Open Scan URL in new tab"
                >
                  <ExternalLink className="size-4" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={loadQR}
            className="text-xs text-slate-600 gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            Refresh QR Token
          </Button>

          <Button variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
