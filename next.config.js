/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@ai-sdk/openai', '@ai-sdk/groq']
  }
}

module.exports = nextConfig 