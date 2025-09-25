import { viteStaticCopy } from 'vite-plugin-static-copy'
import { defineConfig } from 'wxt'

const wasmPath = 'node_modules/fcitx5-js/dist/'

export default defineConfig({
  manifest: {
    name: '__MSG_extName__',
    default_locale: 'en',
    description: '__MSG_extDescription__',
    permissions: [
      'input',
    ],
    input_components: [{
      name: '__MSG_imName__',
      type: 'ime',
      id: 'fcitx5',
      description: '__MSG_imDescription__',
      language: ['en-US'],
      layouts: ['us'],
    }],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';", // eslint-disable-line style/quotes
    },
  },
  outDirTemplate: 'fcitx5-chrome',
  modules: ['@wxt-dev/auto-icons'],
  autoIcons: {
    baseIconPath: 'assets/fcitx.svg',
  },
  vite: () => ({
    plugins: [
      viteStaticCopy({
        targets: ['Fcitx5.data', 'Fcitx5.wasm', 'libFcitx5Config.so', 'libFcitx5Core.so', 'libFcitx5Utils.so'].map(file => ({
          src: wasmPath + file,
          dest: '',
        })),
      }),
    ],
  }),
})
