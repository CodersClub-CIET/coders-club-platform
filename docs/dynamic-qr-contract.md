# Dynamic QR Attendance Architecture & API Contract

**Author:** Ezhilarasi K (Dynamic QR Lead)  
**Module:** Dynamic QR Attendance  
**Repository:** `CodersClub-CIET/coders-club-platform`  
**Target Branch:** `develop`

---

## 1. Executive Summary & Architecture Overview

The Dynamic QR module provides a unified, server-authoritative attendance system for the Coders Club Management Platform. It serves two distinct attendance flows using the **same underlying cryptographic challenge infrastructure**:

1. **Student Attendance QR:** Operated by an Associate for an assigned event, track, or session. Unauthenticated students scan the QR via a standard phone camera or Google Lens and submit their roll/register number and name through the verification portal.
2. **Associate Attendance QR:** Operated by an Admin. Authenticated Associates scan the QR to register duty, mentorship, or meeting participation.

### High-Level Architecture Flow

```
┌────────────────────────────────────────────────────────┐
│               Admin / Associate Dashboard               │
│                (/dynamic-qr Display View)              │
└──────────────────────────┬─────────────────────────────┘
                           │ 1. Start Session / Rotate Challenge
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Server / API Layer                   │
│   (Next.js Route Handlers / Django REST Framework)     │
│  - Generates opaque crypto random challenge tokens     │
│  - Enforces time-bound expiration                      │
│  - Handles atomic consumption                          │
└─────────────┬───────────────────────────┬──────────────┘
              │                           │
              │ 2. Persists & Validates   │ 3. Broadcasts updates
              ▼                           ▼
┌──────────────────────────┐   ┌─────────────────────────┐
│   Supabase PostgreSQL    │   │    Supabase Realtime    │
│  - qr_attendance_sessions│   │  - challenge-rotated    │
│  - qr_challenges         │   │  - attendance-marked    │
│  - qr_attendance_records │   │  - session-ended        │
└──────────────────────────┘   └─────────────────────────┘
              ▲
              │ 4. Scan & Consume Challenge
┌─────────────┴──────────────────────────────────────────┐
│             Attendee Mobile Scan Flow                  │
│              (/dynamic-qr/scan Portal)                 │
│  - Camera / Google Lens scans URL                      │
│  - Server validates token, expiration, duplicate check │
└────────────────────────────────────────────────────────┘
```

---

## 2. Security Threat Model & Mitigations

| Threat | Vulnerability Mechanism | Server Mitigation |
| :--- | :--- | :--- |
| **Token Guessing / Brute Force** | Predictable timestamps or sequential IDs in QR code. | **Opaque Random Tokens:** Challenges use `gen_random_bytes(32)` (64 hex characters) from cryptographic RNGs. No personal or predictable data is placed in the QR. |
| **Token Replay (Double Scan)** | Re-submitting the same QR token by another attendee. | **Atomic Single-Use Consumption:** Challenge status is changed from `active` to `consumed` in an atomic database transaction (`FOR UPDATE`). Second attempt receives `CHALLENGE_ALREADY_CONSUMED` (HTTP 410). |
| **Screenshot / Photo Replay** | Attendees taking photos of QR and texting them to absent friends. | **Short Authoritative Validity Window:** Server invalidates challenges after 15–30 seconds. Expired tokens are rejected (`CHALLENGE_EXPIRED`). Rotation is server-controlled, not client-guessed. |
| **Duplicate Attendance** | Student scanning multiple times for the same session. | **Unique Constraint:** Database index `UNIQUE (event_id, attendance_context, student_reg_number)` strictly prevents duplicate records. |
| **Cross-Event / Cross-Context Replay** | Using a token generated for Event A on Event B. | **Context Binding:** Challenge is cryptographically bound to its parent `session_id`, `event_id`, and `attendance_context`. |
| **Client-Side Authorization Bypass** | Tampering with request payload or role in frontend. | **Server-Authoritative Validation:** The backend independently resolves user identity, role, permissions, and session status. Client assertions are never trusted. |

---

## 3. Database Schema (Supabase PostgreSQL)

Migration file: `supabase/migrations/20261003000000_dynamic_qr.sql`

### Tables

1. `qr_attendance_sessions`:
   - `id UUID PRIMARY KEY`: Unique session identifier.
   - `session_code VARCHAR(32) UNIQUE`: Human-readable reference (e.g. `CC-109283`).
   - `event_id VARCHAR(100)`: Target event.
   - `event_name TEXT`: Event title.
   - `sub_event_id VARCHAR(100) NULL`: Optional track/breakout room.
   - `sub_event_name TEXT NULL`: Track label.
   - `attendance_context VARCHAR(100)`: E.g., `session_1`, `session_2`, `morning`, `entry`.
   - `target_role VARCHAR(20)`: `student` or `associate`.
   - `creator_role VARCHAR(20)`: `admin` or `associate`.
   - `created_by UUID`: Creator reference.
   - `status VARCHAR(20)`: `active`, `paused`, `ended`, `expired`.
   - `challenge_refresh_interval_seconds INT`: Defaults to 30.
   - `current_challenge_id UUID REFERENCES qr_challenges(id)`: Active challenge.
   - `attendance_count INT`: Live attendee tally.

2. `qr_challenges`:
   - `id UUID PRIMARY KEY`: Challenge identifier.
   - `session_id UUID REFERENCES qr_attendance_sessions(id) ON DELETE CASCADE`.
   - `challenge_token VARCHAR(128) UNIQUE`: Opaque 256-bit cryptographic token.
   - `status VARCHAR(20)`: `active`, `expired`, `consumed`, `invalid`.
   - `issued_at TIMESTAMPTZ`: Issue timestamp.
   - `expires_at TIMESTAMPTZ`: Expiration deadline.
   - `consumed_at TIMESTAMPTZ NULL`: Consumption timestamp.
   - `consumed_by_id VARCHAR(100) NULL`: Attendee ID or roll number.
   - `consumption_ip VARCHAR(45) NULL`: Audit IP address.
   - `user_agent TEXT NULL`: Client user-agent.

3. `qr_attendance_records`:
   - `id UUID PRIMARY KEY`.
   - `session_id UUID REFERENCES qr_attendance_sessions(id)`.
   - `challenge_id UUID UNIQUE REFERENCES qr_challenges(id)`: Guarantees 1-to-1 challenge usage.
   - `event_id VARCHAR(100)`.
   - `attendance_context VARCHAR(100)`.
   - `attendee_type VARCHAR(20)`: `student` or `associate`.
   - `student_reg_number VARCHAR(60) NULL`.
   - `student_name VARCHAR(150) NULL`.
   - `student_email VARCHAR(200) NULL`.
   - `student_department VARCHAR(100) NULL`.
   - `associate_id UUID NULL`.
   - `marked_at TIMESTAMPTZ`.
   - `scanner_device_hash VARCHAR(128) NULL`.
   - `verified_by_server BOOLEAN DEFAULT true`.

---

## 4. API Endpoints Specification

Both Django REST API and Next.js API route handlers follow this exact contract:

### 4.1. Create Attendance Session
- **Method:** `POST /api/dynamic-qr/sessions`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
```json
{
  "event_id": "evt-react-bootcamp",
  "event_name": "Full Stack React & Next.js Workshop",
  "sub_event_id": "track-nextjs-app",
  "sub_event_name": "App Router Mastery",
  "attendance_context": "session_1",
  "target_role": "student",
  "refresh_interval_seconds": 30
}
```
- **Response (`201 Created`):**
```json
{
  "session": {
    "id": "c1f6b8b2-4d5e-4c7b-9f3a-1a2b3c4d5e6f",
    "session_code": "CC-482910",
    "event_id": "evt-react-bootcamp",
    "event_name": "Full Stack React & Next.js Workshop",
    "attendance_context": "session_1",
    "target_role": "student",
    "status": "active",
    "challenge_refresh_interval_seconds": 30,
    "attendance_count": 0,
    "started_at": "2026-10-03T06:30:00.000Z"
  },
  "challenge": {
    "id": "e2d8c9a1-0b3c-4d5e-6f7a-8b9c0d1e2f3a",
    "session_id": "c1f6b8b2-4d5e-4c7b-9f3a-1a2b3c4d5e6f",
    "challenge_token": "a4f8c9b2e1d047a83b9c6f2e4d8a1c3e5b7f9a0c2e4d6f8a1b3c5e7d9f0a2b4c",
    "status": "active",
    "issued_at": "2026-10-03T06:30:00.000Z",
    "expires_at": "2026-10-03T06:30:30.000Z"
  }
}
```

### 4.2. Refresh / Rotate Challenge
- **Method:** `POST /api/dynamic-qr/sessions/:id/refresh`
- **Request Body:**
```json
{
  "validity_seconds": 30
}
```
- **Response (`200 OK`):**
```json
{
  "session_id": "c1f6b8b2-4d5e-4c7b-9f3a-1a2b3c4d5e6f",
  "challenge": {
    "id": "f3e9d0b2-1c4d-5e6f-7a8b-9c0d1e2f3a4b",
    "session_id": "c1f6b8b2-4d5e-4c7b-9f3a-1a2b3c4d5e6f",
    "challenge_token": "7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c",
    "status": "active",
    "issued_at": "2026-10-03T06:30:30.000Z",
    "expires_at": "2026-10-03T06:31:00.000Z"
  },
  "remaining_seconds": 30
}
```

### 4.3. End Attendance Session
- **Method:** `POST /api/dynamic-qr/sessions/:id/end`
- **Response (`200 OK`):**
```json
{
  "session_id": "c1f6b8b2-4d5e-4c7b-9f3a-1a2b3c4d5e6f",
  "status": "ended",
  "ended_at": "2026-10-03T07:15:00.000Z",
  "final_attendance_count": 42
}
```

### 4.4. Verify and Consume Challenge (Attendance Claim)
- **Method:** `POST /api/dynamic-qr/consume`
- **Request Body (Student Flow):**
```json
{
  "session_id": "c1f6b8b2-4d5e-4c7b-9f3a-1a2b3c4d5e6f",
  "challenge_token": "7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c",
  "attendee_type": "student",
  "student_reg_number": "71762105001",
  "student_name": "Ezhilarasi K",
  "student_department": "Computer Science & Engineering",
  "student_email": "ezhilarasi@college.edu",
  "scanner_fingerprint": "fp-89ab3f"
}
```
- **Response (`200 OK` - Success):**
```json
{
  "success": true,
  "message": "Attendance successfully recorded and verified by server",
  "record": {
    "id": "b5a9c8d7-e6f5-4a3b-2c1d-0e9f8a7b6c5d",
    "session_id": "c1f6b8b2-4d5e-4c7b-9f3a-1a2b3c4d5e6f",
    "event_id": "evt-react-bootcamp",
    "event_name": "Full Stack React & Next.js Workshop",
    "attendance_context": "session_1",
    "attendee_type": "student",
    "student_reg_number": "71762105001",
    "student_name": "Ezhilarasi K",
    "marked_at": "2026-10-03T06:30:45.120Z",
    "status": "valid",
    "verified_by_server": true
  }
}
```
- **Error Responses:**
  - `CHALLENGE_EXPIRED` (`410 Gone`): Challenge token has expired.
  - `CHALLENGE_ALREADY_CONSUMED` (`410 Gone`): Challenge token was already consumed.
  - `DUPLICATE_ATTENDANCE` (`409 Conflict`): Attendance already marked for this student/associate in this event & context.
  - `ROLE_MISMATCH` (`400 Bad Request`): Scanned QR target role does not match attendee type.
  - `SESSION_ENDED` (`400 Bad Request`): Session has been ended by the coordinator.

---

## 5. Team Integration Points

1. **Attendance Team:**
   - Records created in `qr_attendance_records` can be synced or cross-referenced directly with master attendance sheets by `event_id`, `attendance_context`, and `student_reg_number` / `associate_id`.
2. **Security Team:**
   - All scans capture `scanner_device_hash`, `ip_address`, `user_agent`, and exact server timestamp for forensic auditability and replay detection.
3. **Associate Allocation & Event Teams:**
   - Predefined and dynamic events attach to `event_id` and `sub_event_id` to prevent cross-event attendance collisions.
