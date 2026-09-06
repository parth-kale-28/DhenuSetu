# Email notification setup

DhenuSetu sends transactional emails through Nodemailer using Gmail SMTP.

For the simplest setup:
```env
GMAIL_USER=dhenusetu@gmail.com
GMAIL_APP_PASSWORD=YOUR_16_CHARACTER_APP_PASSWORD
```

Create the App Password:
1. Open Google Account → Security.
2. Enable 2-Step Verification for `dhenusetu@gmail.com`.
3. Open App Passwords.
4. Create an app password for Mail.
5. Put the generated 16-character value into `GMAIL_APP_PASSWORD`.

You do not need:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`

Those three variables belong to the alternative Gmail OAuth2 setup. The current DhenuSetu build uses App Password SMTP because it is much simpler for this project.

Templates are already implemented for:
- Mastitis risk alert
- Connection request/update
- Lab report update
- New message

Never put the email credential in the React frontend.
