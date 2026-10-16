# Library-management-system

## Production authentication

Set `AUTH_SECRET` in the deployment environment to a private random value of at least 32 characters. For example, generate one with `openssl rand -base64 32`, then add it to the Vercel project's Environment Variables and redeploy. Do not commit the secret.

Authentication sessions are signed cookies and do not require writing session records to the deployment filesystem. They expire after seven days; signing out clears the browser's cookie.