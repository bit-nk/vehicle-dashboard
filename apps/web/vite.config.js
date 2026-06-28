import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Production Content-Security-Policy. Injected at BUILD ONLY - a strict CSP in
// dev would break Vite HMR (eval + ws). The allowlist matches exactly what the
// app loads: Google Fonts (css + font files) and Wikimedia Commons images.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://upload.wikimedia.org",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

const cspPlugin = {
  name: 'inject-csp-meta',
  apply: 'build',
  transformIndexHtml(html) {
    return html.replace(
      '</title>',
      `</title>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
    )
  },
}

// `@shared/*` resolves straight to the shared package SOURCE so Vite compiles
// its JSX as first-class app code (no separate build step for the workspace).
export default defineConfig({
  plugins: [react(), tailwindcss(), cspPlugin],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../../packages/shared/src', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Split the heavy charting lib into its own chunk so it never blocks first paint on mobile.
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
        },
      },
    },
  },
})
