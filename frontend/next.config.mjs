/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts', 'date-fns', 'react-markdown'],
    },
};

export default nextConfig;