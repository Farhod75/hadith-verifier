/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
             "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.telegram.org https://api.elevenlabs.io",
             "media-src 'self' blob: https://cdn.islamic.network",
             "media-src 'self' blob:",
              "font-src 'self'",
              "frame-ancestors 'none'",
            ].join('; ')
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://hadithverifier.com' },
          { key: 'Access-Control-Allow-Methods', value: 'POST, GET, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
