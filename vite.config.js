import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/directorio-valladolid/',
  plugins: [
    tailwindcss(),
  ],
})
