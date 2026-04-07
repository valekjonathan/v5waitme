import { registerPlugin } from '@capacitor/core'

export const WaitmeWebAuth = registerPlugin('WaitmeWebAuth', {
  web: () => ({
    async start() {
      throw new Error('WaitmeWebAuth is only available on native platforms')
    },
  }),
})
