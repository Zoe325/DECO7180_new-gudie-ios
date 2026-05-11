GuideWay iPhone + Safari final frontend package

Files:
- index.html
- style.css
- script.js

Recommended deployment:
- Upload all 3 files to your GitHub Pages repository root.
- Open the Pages URL in Safari on iPhone.
- Tap Start Navigation to request rear camera access.

Important Safari notes:
- Camera access works only on HTTPS (for example GitHub Pages) or localhost.
- iPhone Safari does not support the Vibration API, so this prototype uses visual shake fallback instead of true physical vibration on Safari.
- Voice synthesis should work in Safari after a user gesture.
- Voice query uses web speech recognition only when Safari exposes the recognition interface; otherwise text input remains available.
