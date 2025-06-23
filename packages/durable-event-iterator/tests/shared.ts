import Database from 'better-sqlite3'

export function createDurableObjectState(): any {
  const db = new Database(':memory:')

  return {
    storage: {
      sql: {
        exec: (query: string, ...bindings: any[]) => {
          const method = query.includes('SELECT') || query.includes('RETURNING') ? 'all' : 'run'
          const result = db.prepare(query)[method](...bindings)

          if (method === 'all') {
            return {
              one: () => (result as any)[0],
              toArray: () => result,
            }
          }
        },
      },
    },
  }
}
