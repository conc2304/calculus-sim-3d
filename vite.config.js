import glsl from 'vite-plugin-glsl'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 1234
  },
  plugins: [
    glsl()
  ],
  base: "/calculus-sim-3d/"

})
