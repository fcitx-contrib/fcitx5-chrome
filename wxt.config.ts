import { defineConfig } from 'wxt'

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
  },
  outDirTemplate: 'fcitx5-chrome',
})
