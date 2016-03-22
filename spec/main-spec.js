'use babel'
/* eslint-env jasmine */

describe('debug', () => {
  let mainModule = null

  beforeEach(() => {
    waitsForPromise(() => {
      return atom.packages.activatePackage('debug').then((pack) => {
        mainModule = pack.mainModule
      })
    })
  })

  describe('when the debug package is activated', () => {
    it('activates successfully', () => {
      expect(mainModule).toBeDefined()
      expect(mainModule).toBeTruthy()
      expect(mainModule.subscriptions).toBeDefined()
      expect(mainModule.subscriptions).toBeTruthy()
    })
  })
})
