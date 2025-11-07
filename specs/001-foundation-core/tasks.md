# Tasks: 平台基础架构与核心能力

**Input**: Design documents from `/specs/001-foundation-core/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Unit tests are NOT explicitly requested in the spec, so test tasks are OPTIONAL and not included by default.

**Organization**: Tasks are grouped by user story (US1-US8) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md, this is a SvelteKit monorepo with:

- Main app: `src/` at repository root
- SDK package: `packages/sdk/`
- Config: `config/`
- Tests: `tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize SvelteKit project with TypeScript and pnpm in repository root
- [x] T002 [P] Install core dependencies (SvelteKit, Svelte 5, TypeScript, Vite) in package.json
- [x] T003 [P] Install UI dependencies (FlyonUI, Tailwind CSS v4) in package.json
- [x] T004 [P] Install development tools (ESLint, Prettier, Vitest) in package.json
- [x] T005 Configure Tailwind CSS v4 in tailwind.config.js with FlyonUI plugin
- [x] T006 [P] Configure ESLint in .eslintrc.cjs for TypeScript and Svelte
- [x] T007 [P] Configure Prettier in .prettierrc for code formatting
- [x] T008 Create global styles with Tailwind imports in src/app.css
- [x] T009 Create project directory structure (src/routes, src/lib/components, src/lib/services, src/lib/stores, src/lib/types, src/lib/utils, config, packages/sdk, tests)
- [x] T010 [P] Setup TypeScript configuration in tsconfig.json with strict mode
- [x] T011 [P] Create .env.example file with PORT, LOG_LEVEL, DATA_DIR, LIBREOFFICE_PATH
- [x] T012 [P] Add npm scripts in package.json (dev, build, preview, test, lint, check)
- [x] T013 [P] Create .gitignore for node_modules, .env, data/, build/
- [x] T014 Setup Vitest configuration in vitest.config.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T015 Create base TypeScript types in src/lib/types/api.ts (ApiSuccessResponse, ApiErrorResponse)
- [x] T016 [P] Create data model types in src/lib/types/models.ts (Session, File, Task, FileType, TaskType, etc.)
- [x] T017 [P] Create config types in src/lib/types/config.ts (SystemConfig, ModelConfig)
- [x] T018 Implement structured logger service in src/lib/services/logger.service.ts (JSON format, traceId, levels)
- [x] T019 Implement error handler utility in src/lib/utils/error.ts (unified error response format)
- [x] T020 Implement traceId generator utility in src/lib/utils/trace.ts (UUID v4 generation)
- [x] T021 Create API response helper in src/lib/utils/api.ts (success/error response builders)
- [x] T022 Create validation utilities in src/lib/utils/validation.ts (file type, size, UUID validation)
- [x] T023 Setup environment configuration loader in src/lib/utils/config.ts (read from .env)
- [x] T024 Create system configuration YAML schema in config/system.yaml (upload limits, TTL, timeouts)
- [x] T025 Implement storage service base structure in src/lib/services/storage.service.ts (directory creation, path utilities)
- [x] T026 Create base API endpoint structure in src/routes/api/+server.ts (traceId middleware, error handling)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 项目骨架与开发环境搭建 (Priority: P1) 🎯 MVP

**Goal**: Establish project foundation with SvelteKit, i18n, and development tools

**Independent Test**: Start dev server, access default page, switch languages, run build successfully

### Implementation for User Story 1

- [x] T027 [P] [US1] Install i18n library (paraglide-js) in package.json
- [x] T028 [P] [US1] Initialize paraglide-js configuration with zh-CN and en-US locales
- [x] T029 [P] [US1] Create i18n message files in src/i18n/zh-CN.json (common UI strings, errors, success messages)
- [x] T030 [P] [US1] Create i18n message files in src/i18n/en-US.json (English translations)
- [x] T031 [US1] Implement i18n service in src/lib/services/i18n.service.ts (locale detection, switching, storage)
- [x] T032 [US1] Create language store in src/lib/stores/language.ts (reactive language state)
- [x] T033 [US1] Create root layout in src/routes/+layout.svelte (HTML structure, i18n provider, global styles)
- [x] T034 [US1] Create default landing page in src/routes/+page.svelte (welcome message, language switcher)
- [x] T035 [US1] Create language switcher component in src/lib/components/ui/LanguageSwitcher.svelte
- [x] T036 [US1] Configure HMR settings in vite.config.ts for optimal development experience
- [x] T037 [US1] Test development server startup and hot module replacement
- [x] T038 [US1] Test production build and verify output in build/ directory

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - 基础组件库与布局系统 (Priority: P1)

**Goal**: Build reusable UI components and responsive layout system

**Independent Test**: Create component showcase page, verify all components render correctly, test responsive behavior

### Implementation for User Story 2

- [x] T039 [P] [US2] Create Button component in src/lib/components/ui/Button.svelte (variants: primary, secondary, danger, disabled, loading)
- [x] T040 [P] [US2] Create Card component in src/lib/components/ui/Card.svelte (header, content, actions, collapsible)
- [x] T041 [P] [US2] Create Progress component in src/lib/components/ui/Progress.svelte (percentage, animated)
- [x] T042 [P] [US2] Create Modal component in src/lib/components/ui/Modal.svelte (overlay, close button, custom actions)
- [x] T043 [P] [US2] Create Dropdown component in src/lib/components/ui/Dropdown.svelte (single select, searchable)
- [x] T044 [P] [US2] Create Notification component in src/lib/components/ui/Notification.svelte (success, error, warning, info)
- [x] T045 [P] [US2] Create Input component in src/lib/components/ui/Input.svelte (text, validation, error states)
- [x] T046 [P] [US2] Create Textarea component in src/lib/components/ui/Textarea.svelte (auto-resize, character count)
- [x] T047 [US2] Create ResizablePanel component in src/lib/components/layout/ResizablePanel.svelte (drag handle, min/max constraints)
- [x] T048 [US2] Create SplitPane component in src/lib/components/layout/SplitPane.svelte (horizontal/vertical, nested support)
- [x] T049 [US2] Update main page layout in src/routes/+page.svelte (implement split pane: left panel with top/bottom, right panel)
- [x] T050 [US2] Add responsive breakpoints in tailwind.config.js (mobile, tablet, desktop)
- [x] T051 [US2] Implement responsive layout switching in src/lib/components/layout/SplitPane.svelte (stack on mobile)
- [x] T052 [US2] Create UI state store in src/lib/stores/ui.ts (panel sizes, theme preferences)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - 文件上传与预览核心能力 (Priority: P1)

**Goal**: Enable file upload (image/PDF/Office) with preview functionality

**Independent Test**: Upload different file types, verify progress display, confirm preview rendering, test error handling

### Implementation for User Story 3

- [x] T053 [P] [US3] Create File entity interfaces in src/lib/types/models.ts (ImageMetadata, PDFMetadata, OfficeMetadata)
- [x] T054 [P] [US3] Create session store in src/lib/stores/session.ts (sessionId, files, language)
- [x] T055 [P] [US3] Create documents store in src/lib/stores/documents.ts (uploaded files, current preview)
- [x] T056 [US3] Implement storage service file operations in src/lib/services/storage.service.ts (save file, generate path, cleanup)
- [x] T057 [US3] Implement LibreOffice service in src/lib/services/office.service.ts (detect installation, convert Office to PDF)
- [x] T058 [US3] Create upload API endpoint in src/routes/api/upload/+server.ts (handle multipart, validate file, save to storage)
- [x] T059 [US3] Implement file validation in upload endpoint (type check, size limit, MIME validation)
- [x] T060 [US3] Implement Office conversion trigger in upload endpoint (create Task, queue conversion)
- [x] T061 [US3] Create Uploader component in src/lib/components/upload/Uploader.svelte (file picker, drag-and-drop, progress bar)
- [x] T062 [US3] Implement upload progress tracking in Uploader component (chunked upload, percentage display)
- [x] T063 [P] [US3] Install PDF.js library in package.json
- [x] T064 [US3] Create PDFPreview component in src/lib/components/preview/PDFPreview.svelte (render pages, zoom, navigation)
- [x] T065 [P] [US3] Create ImagePreview component in src/lib/components/preview/ImagePreview.svelte (zoom, pan, responsive)
- [x] T066 [US3] Create preview coordinator in src/routes/+page.svelte (switch between image/PDF preview based on file type)
- [x] T067 [US3] Implement error handling for upload failures (network errors, file type errors, size errors)
- [x] T068 [US3] Add upload success/error notifications using Notification component
- [x] T069 [US3] Implement file metadata extraction (image dimensions, PDF page count) in storage service

**Checkpoint**: At this point, User Story 3 should be fully functional and testable independently

---

## Phase 6: User Story 4 - 统一服务端 API 架构与错误处理 (Priority: P1)

**Goal**: Establish standardized API structure with unified error handling and logging

**Independent Test**: Call health endpoint, verify response format, trigger errors, check logs for traceId

### Implementation for User Story 4

- [x] T070 [US4] Implement health check endpoint in src/routes/api/health/+server.ts (LibreOffice availability, uptime)
- [x] T071 [US4] Create attachments upload endpoint in src/routes/api/attachments/+server.ts (similar to main upload, different category)
- [x] T072 [US4] Create task query endpoint in src/routes/api/task/[id]/+server.ts (return Task status and progress)
- [x] T073 [US4] Create file info endpoint in src/routes/api/files/[fileId]/+server.ts (GET file metadata)
- [x] T074 [US4] Create file delete endpoint in src/routes/api/files/[fileId]/+server.ts (DELETE operation)
- [x] T075 [US4] Create file download endpoint in src/routes/api/files/[fileId]/download/+server.ts (stream file content)
- [x] T076 [US4] Implement request logging middleware (log all requests with traceId, duration, HTTP status)
- [x] T077 [US4] Implement error boundary for uncaught exceptions (global error handler, return user-friendly errors)
- [x] T078 [US4] Parse Accept-Language header in API endpoints (determine user language preference)
- [x] T079 [US4] Implement i18n message resolution in API responses (resolve message keys to localized strings)
- [x] T080 [US4] Configure log file rotation in logger service (daily rotation, auto-cleanup)
- [x] T081 [US4] Add structured logging for key events (upload.start, upload.complete, convert.start, convert.done)
- [x] T082 [US4] Test all endpoints return correct unified response format (success and error cases)

**Checkpoint**: At this point, User Stories 1-4 should all be independently functional

---

## Phase 7: User Story 5 - 模型配置与调用适配层 (Priority: P2)

**Goal**: Configure AI models via YAML and implement OpenAI-compatible adapter

**Independent Test**: Load model config, call test endpoint, verify timeout/concurrency limits, test config reload

### Implementation for User Story 5

- [x] T083 [P] [US5] Create model configuration schema in config/models.yaml (model ID, name, category, endpoint, timeout, concurrency)
- [x] T084 [P] [US5] Create ModelConfig type in src/lib/types/config.ts (categories: ocr, translate, qa, review, extract)
- [x] T085 [US5] Implement config loader in src/lib/utils/config.ts (parse YAML, validate schema, read API keys from env)
- [x] T086 [US5] Implement model service in src/lib/services/model.service.ts (load configs, select model by category)
- [x] T087 [US5] Implement OpenAI adapter in src/lib/services/model.service.ts (format requests, handle responses)
- [x] T088 [US5] Implement timeout handling in model service (abort requests after configured timeout)
- [x] T089 [US5] Implement concurrency limiter in model service (queue requests exceeding limit)
- [x] T090 [US5] Implement request queue with position tracking (return queue position in response)
- [x] T091 [US5] Implement error handling for model calls (network errors, API errors, structured logging)
- [x] T092 [US5] Implement config reload endpoint in src/routes/api/config/reload/+server.ts (hot reload without restart)
- [x] T093 [US5] Add model availability check to health endpoint (test connectivity to configured models)
- [x] T094 [US5] Document model configuration format in config/models.yaml (inline comments, examples)

**Checkpoint**: At this point, User Story 5 should be independently functional

---

## Phase 8: User Story 6 - 文件存储与生命周期管理 (Priority: P2)

**Goal**: Implement file storage with session isolation and automatic TTL-based cleanup

**Independent Test**: Upload files, verify storage structure, wait for TTL, confirm cleanup, test quota limits

### Implementation for User Story 6

- [x] T095 [US6] Implement session creation in storage service (generate sessionId, create directory structure)
- [x] T096 [US6] Implement file path generation (uploads/, converted/, results/ subdirectories)
- [x] T097 [US6] Add file metadata persistence in storage service (store File entity as JSON alongside file)
- [x] T098 [US6] Implement TTL tracking in storage service (record creation time, calculate expiry)
- [x] T099 [US6] Create cleanup scheduler in src/lib/services/cleanup.service.ts (run hourly, check TTL, delete expired)
- [x] T100 [US6] Implement file deletion logic (remove file and metadata, delete empty directories)
- [x] T101 [US6] Implement disk usage tracking in storage service (calculate total size, check against quota)
- [x] T102 [US6] Implement quota check before upload (reject if exceeds limit)
- [x] T103 [US6] Add session expiry handling (mark session expired, cleanup files)
- [x] T104 [US6] Configure TTL in config/system.yaml (default 24 hours, configurable)
- [x] T105 [US6] Configure disk quota in config/system.yaml (default 100GB, configurable)
- [x] T106 [US6] Add cleanup logging (log deleted files, freed space, duration)
- [x] T107 [US6] Initialize cleanup scheduler on server startup in src/hooks.server.ts

**Checkpoint**: At this point, User Story 6 should be independently functional

---

## Phase 9: User Story 7 - 国际化(i18n)基础设施 (Priority: P2)

**Goal**: Complete i18n implementation for all UI, API messages, and logs

**Independent Test**: Switch languages, verify all text updates, test server-side i18n, check log entries

### Implementation for User Story 7

- [x] T108 [P] [US7] Complete all UI message keys in src/i18n/zh-CN.json (buttons, labels, placeholders, tooltips)
- [x] T109 [P] [US7] Complete all UI message translations in src/i18n/en-US.json
- [x] T110 [P] [US7] Add all error message keys in src/i18n/zh-CN.json (validation, upload, conversion, system errors)
- [x] T111 [P] [US7] Add all error message translations in src/i18n/en-US.json
- [x] T112 [P] [US7] Add success message keys in src/i18n/zh-CN.json (upload success, conversion success)
- [x] T113 [P] [US7] Add success message translations in src/i18n/en-US.json
- [x] T114 [US7] Implement server-side i18n resolver (parse Accept-Language, resolve message keys)
- [x] T115 [US7] Update all API endpoints to use i18n messages (replace hardcoded strings with keys)
- [x] T116 [US7] Update logger service to include i18n keys in log entries (alongside resolved messages)
- [x] T117 [US7] Add missing translation detection in development mode (warn in console)
- [x] T118 [US7] Test language persistence (localStorage, survives page refresh)
- [x] T119 [US7] Test language switching updates all UI elements immediately
- [x] T120 [US7] Verify all components use i18n keys (no hardcoded strings)

**Checkpoint**: At this point, User Story 7 should be independently functional

---

## Phase 10: User Story 8 - JS SDK 基础框架 (Priority: P3)

**Goal**: Create npm package @idealworld/ai-docs-sdk with programmatic API access

**Independent Test**: Install SDK, write test script, call upload/query methods, verify TypeScript types

### Implementation for User Story 8

- [ ] T121 [US8] Create SDK package structure in packages/sdk/ (src/, tests/, package.json, tsconfig.json)
- [ ] T122 [P] [US8] Initialize SDK package.json with name, version, main, types, dependencies
- [ ] T123 [P] [US8] Configure SDK TypeScript in packages/sdk/tsconfig.json (ES modules, declaration files)
- [ ] T124 [US8] Create SDK client class in packages/sdk/src/client.ts (constructor with baseUrl, apiKey, timeout)
- [ ] T125 [P] [US8] Create SDK types in packages/sdk/src/types/index.ts (mirror server types)
- [ ] T126 [US8] Implement upload API in packages/sdk/src/api/upload.ts (uploadMain, uploadAttachment methods)
- [ ] T127 [P] [US8] Implement task API in packages/sdk/src/api/task.ts (getTask method)
- [ ] T128 [P] [US8] Implement file API in packages/sdk/src/api/file.ts (getFile, deleteFile, downloadFile methods)
- [ ] T129 [US8] Implement HTTP client wrapper in packages/sdk/src/utils/http.ts (fetch with timeout, error handling)
- [ ] T130 [US8] Implement error handling in SDK (parse API errors, create custom error classes)
- [ ] T131 [US8] Implement timeout handling in SDK (abort requests, throw timeout error)
- [ ] T132 [US8] Add FormData support for file uploads (handle File/Blob in Node.js and browser)
- [ ] T133 [US8] Export all public APIs in packages/sdk/src/index.ts
- [ ] T134 [US8] Create SDK README with installation and usage examples in packages/sdk/README.md
- [ ] T135 [US8] Build SDK with tsc and verify output in packages/sdk/dist/
- [ ] T136 [US8] Test SDK in Node.js environment (write test script, verify uploads work)
- [ ] T137 [US8] Test SDK in browser environment (create simple HTML page, test upload)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T138 [P] Update README.md with project overview, setup instructions, features
- [x] T139 [P] Create development guide in docs/DEVELOPMENT.md (architecture, conventions, testing)
- [x] T140 [P] Create API documentation based on OpenAPI spec in docs/API.md
- [x] T141 Code review and refactoring (remove duplication, improve naming, add comments)
- [x] T142 Performance optimization (lazy loading, code splitting, bundle size analysis)
- [x] T143 Accessibility audit (keyboard navigation, ARIA labels, screen reader testing)
- [x] T144 Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [x] T145 Security hardening (input sanitization, CORS configuration, rate limiting)
- [x] T146 Add unit tests for core services in tests/unit/ (logger, storage, i18n, validation)
- [x] T147 Add integration tests in tests/integration/ (upload flow, conversion flow, cleanup)
- [x] T148 Run all validation steps from quickstart.md (verify complete setup works)
- [x] T149 [P] Create deployment guide in docs/DEPLOYMENT.md (environment setup, build process)
- [x] T150 Final quality gate check (pnpm test && pnpm lint && pnpm check)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-10)**: All depend on Foundational phase completion
  - US1 (Phase 3): Can start after Foundational - No dependencies on other stories
  - US2 (Phase 4): Can start after Foundational - Depends on US1 (needs i18n and layout)
  - US3 (Phase 5): Can start after Foundational - Depends on US1 (needs i18n) and US2 (needs components)
  - US4 (Phase 6): Can start after Foundational - Depends on US3 (uses upload endpoints)
  - US5 (Phase 7): Can start after Foundational - No dependencies on other stories
  - US6 (Phase 8): Can start after Foundational - Depends on US3 (extends storage service)
  - US7 (Phase 9): Can start after Foundational - Extends US1 i18n implementation
  - US8 (Phase 10): Can start after Foundational - Depends on US3 and US4 (mirrors API)
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Foundational (Phase 2) - CRITICAL BLOCKER
    ↓
    ├─→ US1 (P1) - Foundation
    │       ↓
    │   US2 (P1) - Components (depends on US1)
    │       ↓
    │   US3 (P1) - Upload/Preview (depends on US1, US2)
    │       ↓
    │   US4 (P1) - API Architecture (depends on US3)
    │       ↓
    │   US6 (P2) - Storage Lifecycle (depends on US3)
    │       ↓
    │   US7 (P2) - Complete i18n (depends on US1)
    │       ↓
    │   US8 (P3) - SDK (depends on US3, US4)
    │
    └─→ US5 (P2) - Model Config (independent, can run parallel to US1-4)
```

### Within Each User Story

1. Types/Interfaces first
2. Services/Utilities before components
3. API endpoints after services
4. Components after API endpoints
5. Integration and testing last

### Parallel Opportunities

- **Setup Phase**: T002, T003, T004, T006, T007, T011, T012, T013 can all run in parallel
- **Foundational Phase**: T016, T017 (types) can run in parallel
- **User Story 2**: T039-T046 (all basic components) can run in parallel
- **User Story 3**: T053, T054, T055 (stores and types) can run in parallel; T063, T064, T065 (preview components) can run in parallel
- **User Story 5**: T083, T084 (config schema and types) can run in parallel
- **User Story 7**: All i18n message file updates (T108-T113) can run in parallel
- **User Story 8**: T122, T123, T125 (package setup and types) can run in parallel; T126, T127, T128 (API implementations) can run in parallel
- **Polish Phase**: T138, T139, T140, T149 (documentation) can run in parallel

---

## Parallel Example: User Story 2 (Components)

```bash
# Launch all basic UI components together:
Task T039: "Create Button component in src/lib/components/ui/Button.svelte"
Task T040: "Create Card component in src/lib/components/ui/Card.svelte"
Task T041: "Create Progress component in src/lib/components/ui/Progress.svelte"
Task T042: "Create Modal component in src/lib/components/ui/Modal.svelte"
Task T043: "Create Dropdown component in src/lib/components/ui/Dropdown.svelte"
Task T044: "Create Notification component in src/lib/components/ui/Notification.svelte"

# All can be developed in parallel by different developers or worked on simultaneously
```

---

## Implementation Strategy

### MVP First (User Stories 1-4 Only)

1. Complete Phase 1: Setup (~1 day)
2. Complete Phase 2: Foundational (~1 day, CRITICAL)
3. Complete Phase 3: User Story 1 (~1 day)
4. Complete Phase 4: User Story 2 (~1-2 days)
5. Complete Phase 5: User Story 3 (~2-3 days)
6. Complete Phase 6: User Story 4 (~1 day)
7. **STOP and VALIDATE**: Full end-to-end testing
8. Deploy/demo MVP

**MVP delivers**: Complete development environment, UI component library, file upload/preview, robust API architecture

### Incremental Delivery

1. **Foundation** (Setup + Foundational) → ~2 days → Base infrastructure ready
2. **+ US1** → ~1 day → i18n and dev environment complete → Deployable checkpoint
3. **+ US2** → ~2 days → Component library ready → Deployable checkpoint
4. **+ US3** → ~3 days → File upload/preview working → **MVP COMPLETE** ✅
5. **+ US4** → ~1 day → API fully standardized → Production-ready baseline
6. **+ US5** → ~2 days → Model integration ready → AI capabilities enabled
7. **+ US6** → ~1 day → Storage lifecycle automated → Long-term stability
8. **+ US7** → ~1 day → Complete i18n coverage → International readiness
9. **+ US8** → ~2 days → SDK available → Programmable platform

### Parallel Team Strategy

With 3 developers after Foundational phase:

1. **Week 1**: Team completes Setup + Foundational together (~2 days)
2. **Week 1-2**:
   - Developer A: US1 + US2 (foundation + components)
   - Developer B: US5 (model config - independent)
   - Developer C: Documentation setup
3. **Week 2-3**:
   - Developer A: US3 (upload/preview)
   - Developer B: US4 (API standardization)
   - Developer C: US6 (storage lifecycle)
4. **Week 3**:
   - Developer A: US7 (complete i18n)
   - Developer B: US8 (SDK)
   - Developer C: Polish + testing

---

## Notes

- **[P] tasks**: Different files, no dependencies, can run in parallel
- **[Story] labels**: Map each task to specific user story (US1-US8) for traceability
- **Independent stories**: Each user story delivers standalone value and can be tested independently
- **No tests included**: Spec does not explicitly request TDD approach, tests are optional
- **Sequential dependencies**: US2 depends on US1, US3 depends on US1+US2, US4 depends on US3
- **Independent stories**: US5 can run in parallel with US1-4
- **Commit strategy**: Commit after each task or logical group
- **Validation checkpoints**: Stop at each phase checkpoint to validate story independently
- **Configuration over code**: Use YAML for models and system settings, env vars for secrets
