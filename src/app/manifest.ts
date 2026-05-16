import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'On Earth B2B — CASA 2027',
    short_name: 'ON EARTH',
    description: 'Piattaforma ordini B2B On Earth Collezione CASA 2027',
    start_url: '/catalog',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#000000',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/logo-on-earth/onearth_pittogramma.png',
        sizes: '168x189',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
