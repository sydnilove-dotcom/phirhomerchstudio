# Phi Sigma Rho Merch Studio

A static prototype for Phi Sigma Rho merchandise planning.

## GitHub Pages Setup

1. Create a new public GitHub repository named `phirhomerchstudio`.
2. Upload these files to the repository:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `config.js`
   - `google-apps-script.js`
   - `README.md`
3. In GitHub, open the repository settings.
4. Go to Pages.
5. Set the source to `Deploy from a branch`.
6. Choose the `main` branch and `/root`.
7. Save.

Your free site URL will look like:

`https://sydnilove-dotcom.github.io/phirhomerchstudio/`

## Shared Anonymous Suggestions

The idea board needs Google Sheets storage so anonymous suggestions are visible to everyone.

1. Create a Google Sheet.
2. Copy the Sheet ID from its URL.
3. Open Apps Script from the Sheet.
4. Paste the contents of `google-apps-script.js`.
5. Replace `PASTE_GOOGLE_SHEET_ID_HERE` with the Sheet ID.
6. Deploy as a Web App.
7. Set access to `Anyone`.
8. Copy the Web App URL.
9. Paste that URL into `config.js`:

```js
window.PSR_SHARED_IDEAS_ENDPOINT = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
```

After that, new suggestions submitted by non-admin visitors are saved in the Sheet and loaded for everyone who opens the website.
