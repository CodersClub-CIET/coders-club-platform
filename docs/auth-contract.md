> Current implemented Supabase identity/profile/role behavior is documented in [authentication.md](authentication.md). The Django-era notes below are historical, not an implemented backend or authoritative role source.

\# Authentication Contract



\## Purpose



This document defines the authentication boundary between the

Next.js frontend, Supabase Auth, and Django REST API.



\## Authentication Provider



Supabase Auth is responsible for user identity and session management.



The application has two authenticated roles:



\- Admin

\- Associate



Students do not have platform accounts.



\## Frontend Login Flow



1\. User opens `/login`.

2\. User enters email and password.

3\. Next.js calls Supabase Auth.

4\. Supabase authenticates the user.

5\. Supabase creates/maintains the authenticated session.

6\. Frontend obtains the access token.

7\. Requests to Django include the access token.



\## Django Request



Authenticated API requests use:



Authorization: Bearer <supabase-access-token>



Example:



GET /api/events/



Authorization: Bearer <access-token>



\## Backend Responsibility



Django must independently validate the access token.



The frontend must never be treated as the authority for:



\- user identity

\- role

\- associate approval

\- permissions

\- event allocation

\- attendance access

\- score permissions



\## Role



The application supports:



\- admin

\- associate



The authoritative role must come from the backend/application profile,

not from frontend hardcoded values.



\## Associate Approval



An associate account may exist but remain unapproved.



Conceptually:



approved = false



Until an Admin approves the associate, protected associate operations

must remain unavailable.



Approval must be enforced server-side.



\## Authorization



Django must verify:



1\. Token validity

2\. User identity

3\. Role

4\. Approval status

5\. Required permission

6\. Resource ownership/allocation where applicable



\## Frontend Responsibility



The frontend may hide or show UI based on returned authorization

information for user experience.



However, frontend checks are not security boundaries.



\## API Client



The shared frontend API client automatically attaches the current

Supabase access token when a session exists.



Module developers should use the shared API client instead of manually

constructing authentication headers.



\## Logout



Logout is performed through Supabase Auth.



After logout, the frontend returns the user to `/login`.



\## Security Ownership



Frontend authentication infrastructure:

Foundation



Backend token validation and authorization:

Django Backend + Security



Security review:

Security team



Business permissions:

Backend + Security

