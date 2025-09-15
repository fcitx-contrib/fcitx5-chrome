import { defineConfig } from 'wxt'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const wasmPath = 'node_modules/fcitx5-js/dist/'

export default defineConfig({
  manifest: {
    name: 'Fcitx5',
    permissions: [
      'input',
    ],
    input_components: [{
      name: 'Fcitx5',
      type: 'ime',
      id: 'fcitx5',
      description: 'Fcitx5 input method framework',
      language: ['en-US'],
      layouts: ['us'],
    }],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
    }
  },
  outDirTemplate: 'fcitx5-chrome',
  vite: () => ({
    plugins: [
      viteStaticCopy({
        targets: ['Fcitx5.data', 'Fcitx5.wasm', 'libFcitx5Config.so', 'libFcitx5Core.so', 'libFcitx5Utils.so'].map(file => ({
          src: wasmPath + file,
          dest: '',
        })),
      })
    ]
  })
})
