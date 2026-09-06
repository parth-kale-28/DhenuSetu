# Cloudinary media setup

Cloudinary handles DhenuSetu media because the application does not depend on Firebase Storage for uploads.

Used for:
- animal photos
- vaccination certificates
- lab reports
- prescriptions
- veterinary reports
- shed/feed/milking/water images
- chat attachments

Create a Cloudinary account, then place these in `backend/.env`:
```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

The backend creates a short-lived upload signature. The browser uploads using that signature, so the Cloudinary API secret never reaches the frontend.

Cloudinary currently offers a Free plan with no credit card required and 25 monthly credits; usage is still subject to that plan's quota. See Cloudinary pricing before using it at scale.
