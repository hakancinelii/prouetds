import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ProUETDS',
    short_name: 'ProUETDS',
    description:
      'UETDS Tarifesiz (Arızi) Yolcu Taşımacılığı Bildirim ve Yönetim Platformu',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#f8f5ef',
    theme_color: '#f8f5ef',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}
