# Browser Compatibility

This project targets modern evergreen browsers with regular updates. Verified manually:

| Browser | Minimum Version | Notes                                               |
| ------- | --------------- | --------------------------------------------------- |
| Chrome  | Latest (115+)   | Primary development target                          |
| Firefox | Latest (115+)   | PDF canvas performance slightly lower on large docs |
| Edge    | Latest          | Same engine as Chrome, no issues observed           |
| Safari  | 17+             | Dynamic import + module worker required for pdf.js  |

## Notes

1. PDF preview uses `pdfjs-dist` via dynamic `import()` to reduce initial bundle size. The worker file is loaded from a CDN; if your CSP blocks external scripts, host the worker locally and set `GlobalWorkerOptions.workerSrc` to a local path.
2. UI relies on Tailwind CSS v4 and FlyonUI; ensure CSS variable and modern flexbox/grid support (present in all target browsers).
3. Resize and zoom interactions support mouse and keyboard; touch resize support is planned (use pinch zoom / drag for image, single-finger drag after zoom > 1x).
4. Fonts and icons use inline SVG (no external font dependencies by default).

## Optional Polyfills

Not required for baseline targets, but if supporting older enterprise browsers add:

- `ResizeObserver` polyfill for layout-aware components
- Pointer Events shim (older Safari < 15)
- `fetch` and `Promise` (only if IE11-esque environments, otherwise unsupported)

## Testing Tips

- Use Playwright to run a quick smoke across Chromium, Firefox, WebKit: `pnpm test:e2e`.
- Validate accessibility using browser devtools and Axe; focus order and resizer keyboard interactions are implemented.
- Check network tab to ensure the pdf.worker is cached and not re-downloaded across page navigations.

## Limitations

- Mobile Safari pinch-to-zoom on PDF canvas may trigger double redraw; performance tuning planned.
- High-resolution ( > 200 DPI ) PDFs may render slowly on older devices; consider reducing scale or adding progressive page rendering.

## Future Enhancements

- Add touch drag handle for the split pane.
- Local hosting of pdf.worker with integrity hash for stricter CSP.
- Automated Lighthouse CI for performance and accessibility budgets.
