it('exports something', async () => {
  expect(Object.keys(await import('./draft-2020-12')).length).toBeGreaterThanOrEqual(1)
})
