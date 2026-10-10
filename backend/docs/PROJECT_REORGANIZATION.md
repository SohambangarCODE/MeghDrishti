# Deployment layout reorganization

The root now contains two source directories: backend and frontend. Root package.json/package-lock.json, README and ignore/attribute files remain because the project is an npm workspace. Local .git and node_modules directories are tooling, excluded from the published source payload.

Moved unchanged: data → backend/data; config → backend/config; shared → backend/shared; supabase → backend/supabase; technical docs → backend/docs; design/Stitch/video/deployment docs → frontend/docs; Python scripts → backend/scripts; Node scripts → frontend/scripts. Source CSV/JSON datasets, migrations and simulation defaults were relocated without edits.

Generated screenshots and logs were retained under ignored backend/artifacts. One-off research/API scripts and the redundant root local environment file were archived in ignored backend/local-archive rather than deleting potentially useful work. Empty old root folders, stale script bytecode and a generated pytest cache were removed. Existing backend/.env.local and frontend/.env.local remain private in their original app folders.

Updated runtime imports, backend data paths, parity paths, script paths, Docker copy paths, Playwright output directory and setup documentation. Docker retains repository-root build context because the existing reference fixture is in frontend/src/fixtures/reference.json. Vercel Root Directory frontend must include source files outside that root for backend/config and backend/shared imports; no backend secrets are imported.

Verified: frontend production build passes; 66 frontend tests pass; browser discovery finds 104 tests in 14 files (browser suite not rerun); all three raw file hashes and installed normalized SHA256 pass; moved Sectivia reference execution produces INR 10,000,000 capital and INR 473,532.89 modeled exposure. All 98 backend tests passed after relocation. Windows sandbox denied cache renames and blocked asyncio localhost sockets; normal-environment verification was used without changing application logic.

No Git commit/push/reset/branch operations and no public deployment were performed. Follow the root README and frontend/docs/VERCEL_FRONTEND_DEPLOYMENT.md for manual GitHub and Vercel publication.
