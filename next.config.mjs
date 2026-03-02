/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Permite uploads de até 10 MB (padrão é 1 MB)
    }
  }
}

export default nextConfig
