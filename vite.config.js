import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
export default defineConfig({
  base:'./',
  plugins:[VitePWA({
    registerType:'autoUpdate',
    includeAssets:['icon.svg','apple-touch-icon.png'],
    manifest:{
      name:'MISE ! — QR Case Finder', short_name:'MISE !',
      description:'Cherche ta mise — inventaire de bruitage, matériel, QR et préparation.',
      theme_color:'#0b0b0d', background_color:'#0b0b0d',
      display:'standalone', start_url:'./', scope:'./', lang:'fr',
      icons:[{src:'icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'},{src:'apple-touch-icon.png',sizes:'180x180',type:'image/png',purpose:'any'}]
    },
    workbox:{navigateFallback:'index.html',globPatterns:['**/*.{js,css,html,svg,json}']}
  })]
})
