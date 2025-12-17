/*
  server.js (DEPRECATED)

  This file previously duplicated the server setup that is now implemented
  in `app.js`. Keeping two files with nearly identical startup logic caused
  duplicate console output and potential confusion. The application uses
  `app.js` as the main entrypoint (see `backend/package.json`).

  To avoid duplicates we keep this file as a small marker explaining the
  deprecation. If you need to start the server manually, run:

    node app.js

  or use the project's npm scripts (e.g., `npm start` or `npm run dev`).
*/

export {};