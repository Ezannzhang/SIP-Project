# E‑Waste Drop — demo static web app

This is a small static demo that shows a QR-bin flow: after scanning a QR a user sees signup/login, then a dashboard where they register what they dropped and earn rewards.

What I added
- `index.html` — main UI
- `styles.css` — styling
- `app.js` — client-side auth, storage, rewards logic (client-only demo)

How to run (Windows PowerShell)
1. Open PowerShell in this folder:

```powershell
cd "C:\Users\User\Documents\sip code"
```

2. Pick one of these options (no Python required):

- Quick (open file directly):

```powershell
Start-Process "C:\Users\User\Documents\sip code\index.html"
```

- Recommended: run the included Node static server (needs Node.js installed):

```powershell
# install dependencies (none required) and start
npm install
npm start
```

The server will listen on port 5500. Open http://localhost:5500 in your browser.

If you want HTTPS locally (self-signed certificate), start with:

```powershell
# on PowerShell
$env:HTTPS = 'true'; npm start
```

Then open https://localhost:5500 (your browser will warn about an untrusted certificate because it's self-signed).

- Alternative: use the VS Code Live Server extension — open `index.html` and click "Go Live".

Notes and next steps
- This demo stores users in localStorage and hashes passwords client-side (SHA-256). This is NOT secure for production. Add a backend (Node, Firebase, etc.) for real deployments.
- Possible improvements: image upload of items, QR code personalization, backend API, email verification, admin dashboard.
