process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = 'true';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      {
        name: 'ai-studio-hmr-suppress',
        transformIndexHtml: {
          order: 'pre' as const,
          handler() {
            return [
              {
                tag: 'script',
                attrs: { type: 'text/javascript' },
                children: `
                  (function() {
                    if (typeof window === 'undefined') return;

                    // Immediately suppress unhandledrejections related to websockets/network
                    window.addEventListener('unhandledrejection', function(event) {
                      var reason = event && event.reason;
                      var text = '';
                      try {
                        text = (reason && (reason.message || reason.stack || reason)) || String(reason || '');
                      } catch(e) {
                        text = String(reason || '');
                      }
                      text = String(text).toLowerCase();
                      if (
                        text.indexOf('websocket') !== -1 ||
                        text.indexOf('closed without opened') !== -1 ||
                        text.indexOf('failed to fetch') !== -1 ||
                        text.indexOf('networkerror') !== -1
                      ) {
                        if (event.preventDefault) event.preventDefault();
                        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                        if (event.stopPropagation) event.stopPropagation();
                        return false;
                      }
                    }, true);

                    // Provide a bulletproof mock for Vite dev HMR websocket
                    var NativeWS = window.WebSocket;
                    if (NativeWS) {
                      function MockWebSocket(url, protocols) {
                        var urlStr = String(url || '');
                        // If Supabase or real external socket, allow native connection
                        if (urlStr.indexOf('supabase.co') !== -1) {
                          return new NativeWS(url, protocols);
                        }
                        
                        var listeners = {};
                        var dummy = {
                          url: urlStr,
                          readyState: 1, // OPEN
                          OPEN: 1,
                          CONNECTING: 0,
                          CLOSING: 2,
                          CLOSED: 3,
                          send: function() {},
                          close: function() {},
                          addEventListener: function(type, fn) {
                            if (!listeners[type]) listeners[type] = [];
                            listeners[type].push(fn);
                            if (type === 'open') {
                              setTimeout(function() {
                                try { fn({ type: 'open' }); } catch(e) {}
                              }, 0);
                            }
                          },
                          removeEventListener: function(type, fn) {
                            if (listeners[type]) {
                              listeners[type] = listeners[type].filter(function(cb) { return cb !== fn; });
                            }
                          },
                          dispatchEvent: function() { return true; },
                          onopen: null,
                          onclose: null,
                          onerror: null,
                          onmessage: null,
                        };

                        setTimeout(function() {
                          try {
                            if (typeof dummy.onopen === 'function') dummy.onopen({ type: 'open' });
                          } catch(e) {}
                        }, 0);

                        return dummy;
                      }

                      MockWebSocket.prototype = NativeWS.prototype;
                      MockWebSocket.CONNECTING = 0;
                      MockWebSocket.OPEN = 1;
                      MockWebSocket.CLOSING = 2;
                      MockWebSocket.CLOSED = 3;
                      window.WebSocket = MockWebSocket;
                    }
                  })();
                `,
                injectTo: 'head-prepend' as const,
              },
            ];
          },
        },
      },
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 2500,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('@supabase') || id.includes('@google/genai')) {
                return 'vendor-services';
              }
              return 'vendor';
            }
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio per runtime environment constraints.
      hmr: false,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
