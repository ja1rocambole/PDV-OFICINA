# Copilot instructions

## Project commands

Run these commands from the repository root after `npm install`:

| Purpose                                          | Command                |
| ------------------------------------------------ | ---------------------- |
| Start the Electron/Vite development app with HMR | `npm run dev`          |
| Preview the production build                     | `npm run start`        |
| Build the Electron/Vite bundles                  | `npm run build`        |
| Lint the repository                              | `npm run lint`         |
| Format supported files with Prettier             | `npm run format`       |
| Build an unpacked application directory          | `npm run build:unpack` |
| Build a Windows installer                        | `npm run build:win`    |
| Build a macOS package                            | `npm run build:mac`    |
| Build a Linux package                            | `npm run build:linux`  |

There is currently no test runner, test script, or test suite in the repository, so there is no supported single-test command. For focused static validation of one JavaScript/JSX file, run `npx eslint path/to/file.js` or `npx eslint path/to/file.jsx`.

## Architecture

- This is an Electron app built with electron-vite, React 19, and Ant Design.
- `src/main/index.js` is the Electron main process. It creates the browser window, initializes the database, registers IPC handlers, and controls application/window lifecycle.
- `src/main/database.js` owns the singleton `better-sqlite3` connection. The database is stored as `pdv-oficina.sqlite` under Electron's `app.getPath('userData')`, not in the repository. Its startup schema currently covers clients, vehicles, products, employees, service orders, order items, and order services.
- `src/main/ipc/` contains main-process handlers grouped by domain. Handlers validate and normalize input before using parameterized SQLite statements.
- `src/preload/index.js` is the renderer boundary. Add renderer-facing capabilities to the explicit `api` object and expose them through `contextBridge`; do not access Node or Electron modules directly from React components.
- `src/renderer/src/main.jsx` mounts the React app. `App.jsx` provides the shell/navigation, and domain components under `components/` own their page-level data loading and UI. The current implemented domain flow is client CRUD through `window.api.clients`.
- IPC is asynchronous: the preload uses `electronAPI.ipcRenderer.invoke`, the main process uses matching `ipcMain.handle` channels, and renderer errors are surfaced with Ant Design messages.
- `electron.vite.config.mjs` keeps separate main, preload, and renderer bundles. The renderer alias `@renderer` resolves to `src/renderer/src`.
- `electron-builder.yml` packages the built output for Windows, macOS, and Linux. Source files are excluded from the packaged application; assets under `resources/` are unpacked as configured.

## Repository conventions

- Use JavaScript and JSX rather than introducing TypeScript unless the surrounding feature requires it.
- Follow the checked-in Prettier settings: single quotes, no semicolons, 100-column print width, and no trailing commas. `.editorconfig` specifies two-space indentation and LF line endings.
- Keep user-facing labels and validation/error messages in Portuguese, matching the existing UI.
- Keep database access in the main process. For a new domain, add its schema/migration handling in `database.js`, a domain IPC module under `src/main/ipc/`, and a narrowly scoped preload API before wiring the React component.
- Use kebab-style IPC channel names with a domain and operation, such as `clients:list`, `clients:create`, `clients:update`, and `clients:delete`.
- Normalize and validate IPC input in the main-process handler before executing SQL. Use prepared statements with named or positional parameters; do not interpolate user input into SQL.
- Database initialization must remain idempotent because it runs on every app startup. Existing schema changes use explicit checks such as `PRAGMA table_info(...)` before `ALTER TABLE`.
- React UI uses Ant Design components and the app imports Ant Design's reset stylesheet from `src/renderer/src/main.jsx`. Preserve the existing component-level state/loading/error pattern when adding CRUD screens.
- Use the existing ESLint flat configuration and Prettier integration. Do not add generated `out/`, `dist/`, dependency, or cache files to changes.
- VS Code debugging configurations are provided for the main process, renderer process, and a combined “Debug All” launch.
