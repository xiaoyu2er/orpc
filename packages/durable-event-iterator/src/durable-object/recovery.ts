import type { StandardRPCCustomJsonSerializer } from '@orpc/client/standard'
import { StandardRPCJsonSerializer } from '@orpc/client/standard'
import { getEventMeta, withEventMeta } from '@orpc/server'
import { stringifyJSON } from '@orpc/shared'

export interface DurableEventIteratorObjectRecoveryOptions {
  customJsonSerializers?: readonly StandardRPCCustomJsonSerializer[]
}

export class DurableEventIteratorObjectRecovery<TEventPayload extends object> {
  private readonly serializer: StandardRPCJsonSerializer
  private readonly itemLifetime: number

  constructor(
    private readonly ctx: DurableObjectState,
    options: DurableEventIteratorObjectRecoveryOptions,
  ) {
    this.itemLifetime = 60 * 5 // 5 minutes
    this.serializer = new StandardRPCJsonSerializer(options)

    this.ensureSchema()
  }

  private ensureSchema(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS "dei:recovery" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payload TEXT NOT NULL,
        created_time INTEGER NOT NULL
      )
    `)

    this.ctx.storage.sql.exec(`
      CREATE INDEX IF NOT EXISTS "dei:idx_recovery_id" ON "dei:recovery" (id)
    `)

    this.ctx.storage.sql.exec(`
      CREATE INDEX IF NOT EXISTS "dei:idx_recovery_created_time" ON "dei:recovery" (created_time)
    `)
  }

  private resetSchema(): void {
    this.ctx.storage.sql.exec(`
      DROP TABLE IF EXISTS "dei:recovery"
    `)

    this.ensureSchema()
  }

  handleRecovery(
    payload: TEventPayload,
  ): TEventPayload {
    const eventMeta = getEventMeta(payload)

    const [json, meta] = this.serializer.serialize({
      payload,
      meta: eventMeta,
    })

    const jsonPayload = stringifyJSON({ json, meta })
    const now = Math.floor(Date.now() / 1000)

    const insert = () => {
      this.ctx.storage.sql.exec(`
        DELETE FROM "dei:recovery" WHERE created_time < ?1
      `, now - this.itemLifetime)

      /**
       * Sqlite INTEGER can be out of safe range for JavaScript,
       * so we use TEXT to store the ID.
       */
      const result = this.ctx.storage.sql.exec(`
        INSERT INTO "dei:recovery" (payload, created_time) VALUES (?1, ?2) 
        RETURNING CAST(id AS TEXT) as id
      `, jsonPayload, now)

      const insertedId = result.one()?.id as string

      return withEventMeta(payload, {
        ...eventMeta,
        id: insertedId,
      })
    }

    try {
      return insert()
    }
    catch {
      /**
       * In the error case, like full disk, exceeding the max number of rows, etc.,
       * we reset the schema and try to insert again.
       * This can lead to data loss, but it's better than failing the entire operation.
       */
      this.resetSchema()
      return insert()
    }
  }

  selectItems(
    lastId: string,
  ): TEventPayload[] {
    const query = `
      SELECT CAST(id AS TEXT) as id, payload
      FROM "dei:recovery"
      WHERE id > ?1
      ORDER BY id ASC
    `

    const result = this.ctx.storage.sql.exec(query, lastId)

    return result.toArray().map((row) => {
      const { json, meta } = JSON.parse(row.payload as string)
      const { payload, meta: eventMeta } = this.serializer.deserialize(json, meta) as { payload: TEventPayload, meta: ReturnType<typeof getEventMeta> }

      return withEventMeta(payload, { ...eventMeta, id: row.id as string })
    })
  }
}
