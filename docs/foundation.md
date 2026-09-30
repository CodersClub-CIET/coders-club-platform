\# Foundation Guide



\## Purpose



The Foundation provides the shared technical infrastructure used by

all modules of the Coders Club Management Platform.



Foundation does not implement business modules.



\## Technology



\- Next.js

\- TypeScript

\- Tailwind CSS

\- shadcn/Base UI

\- Supabase Auth

\- Supabase PostgreSQL

\- Supabase Realtime

\- Django REST API



\## Application Architecture



Next.js

&#x20;   ↓

Django REST API

&#x20;   ↓

Supabase PostgreSQL



Supabase Realtime

&#x20;   ↓

Next.js



Authentication:



Supabase Auth

&#x20;   ↓

Next.js session

&#x20;   ↓

Django access-token validation

&#x20;   ↓

Role and permission checks



\## Authentication



The application has two authenticated roles:



\- Admin

\- Associate



Students do not have platform accounts.



Supabase Auth manages identity and sessions.



Django is responsible for validating the access token and enforcing

authorization.



Frontend authentication checks are for user experience only.



\## API Usage



Frontend modules should use:



&#x20;   apiClient()



from:



&#x20;   lib/api/client.ts



Do not manually create authentication headers for normal API requests.



The API client automatically attaches the current Supabase access token.



\## API Error Contract



Django API errors should follow:



```json

{

&#x20; "error": {

&#x20;   "code": "ERROR\_CODE",

&#x20;   "message": "Human-readable message",

&#x20;   "details": {}

&#x20; }

}

