# Proof Drop for ZABAL Gamez

Small build receipt maker for ZABAL Gamez July open build month.

## What it does

- Creates a ZABAL Gamez build receipt.
- Hashes the POIDH proof photo locally with SHA-256.
- Generates copy-ready X and Farcaster /zabal posts.
- Downloads a portable JSON receipt.
- Links directly to the POIDH claim page.

## Local use

Open `index.html` in a browser, or serve this folder with any static server.

```bash
npx serve .
```

## Submission notes

ZABAL Gamez open build month expects a real, linkable build and a public claim path:

- Live URL
- Public repo
- POIDH proof photo
- X post tagging `@bettercallzaal`
- Farcaster post in `/zabal`
- POIDH claim submission

The app does not upload the proof photo. It only computes the local SHA-256 hash so the file can be bound to the receipt before the final POIDH submission.
