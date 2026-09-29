import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({
  base:'./',
  plugins:[VitePWA({
    registerType:'prompt',
    includeAssets:['favicon.svg','icon.svg','icon-maskable.svg','apple-touch-icon.png','icon-192.png','icon-512.png'],
    manifest:{
      name:'MISES! — QR Case Finder', short_name:'MISES!',
      description:'Cherche ta mise — inventaire de bruitage, matériel, QR et préparation.',
      theme_color:'#D12A74', background_color:'#141311',
      display:'standalone', start_url:'./', scope:'./', lang:'fr',
      icons:[
        {src:'icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'},
        {src:'icon-maskable.svg',sizes:'any',type:'image/svg+xml',purpose:'maskable'},
        {src:'icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
        {src:'icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'},
        {src:'apple-touch-icon.png',sizes:'180x180',type:'image/png',purpose:'any'}
      ]
    },
    workbox:{
      cacheId:'mises-0.4.0-beta.2',
      navigateFallback:'index.html',
      globPatterns:['**/*.{js,mjs,css,html,svg,json,bin,png,ttf}','models/coco-ssd/*'],
      maximumFileSizeToCacheInBytes:8*1024*1024,
      cleanupOutdatedCaches:true,
      clientsClaim:true
    }
  })]
})
