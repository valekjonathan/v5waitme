/**
 * Referencia de plataforma (iPhone 14 real). El SDK oficial lee `browserstack.yml`, no este archivo.
 * En Automate iOS real, BrowserStack usa `browserName: safari` (no confundir con `webkit` en desktop).
 * Cliente Playwright: ver comentario en `browserstack.yml` (1.58.x vs 1.59+).
 */
module.exports = {
  projects: [
    {
      name: 'iPhone 14',
      use: {
        browserName: 'safari',
        'browserstack.device': 'iPhone 14',
        'browserstack.osVersion': '16',
        'browserstack.realMobile': true,
      },
    },
  ],
}
