import type { StandardRPCJsonSerializerOptions } from '@orpc/client/standard'
import type { DurableEventIteratorWebsocket } from './websocket'
import { StandardRPCJsonSerializer } from '@orpc/client/standard'
import { getEventMeta, withEventMeta } from '@orpc/server'
import { parseEmptyableJSON, stringifyJSON } from '@orpc/shared'

export interface EventResumeStorageOptions extends StandardRPCJsonSerializerOptions {
  /**
   * The number of seconds to retain events for resume capability.
   * Used for replaying missed events when clients reconnect.
   *
   * @info Set to 0 to disable resume functionality.
   * @default 300 (5 minutes)
   */
  resumeRetentionSeconds?: number

  /**
   * Prefix for the resume storage table schema.
   * This is used to avoid naming conflicts with other tables in the same Durable Object.
   *
   * @default 'orpc:resume:'
   */
  resumeTablePrefix?: string
}

export interface ResumeEventFilter {
  /** Only websockets that are in this list will receive the event */
  targets?: DurableEventIteratorWebsocket[]
  /** Websockets that are in this list will not receive the event */
  exclude?: DurableEventIteratorWebsocket[]
}

export class EventResumeStorage<TEventPayload extends object> {
  private readonly serializer: StandardRPCJsonSerializer
  private readonly retentionSeconds: number
  private readonly schemaPrefix: string

  get isEnabled(): boolean {
    return this.retentionSeconds > 0
  }

  constructor(
    private readonly durableState: DurableObjectState,
    options: EventResumeStorageOptions = {},
  ) {
    this.retentionSeconds = options.resumeRetentionSeconds ?? 60 * 5 // 5 minutes
    this.schemaPrefix = options.resumeTablePrefix ?? 'orpc:resume:'
    this.serializer = new StandardRPCJsonSerializer(options)

    if (this.isEnabled) {
      this.initSchema()
      this.cleanupExpiredEvents()
    }
  }

  /**
   * Store an payload for resume capability.
   *
   * @returns The updated meta of the stored payload
   */
  store(
    payload: TEventPayload,
    resumeFilter: ResumeEventFilter,
  ): TEventPayload {
    if (!this.isEnabled) {
      return payload
    }

    this.cleanupExpiredEvents()

    const serializedEvent = this.serializeEventPayload(payload)
    const targetIds = resumeFilter.targets?.map(
      ws => ws['~orpc'].deserializeTokenPayload().id,
    )
    const excludeIds = resumeFilter.exclude?.map(
      ws => ws['~orpc'].deserializeTokenPayload().id,
    )

    const insertEvent = () => {
      /**
       * SQLite INTEGER can exceed JavaScript's safe integer range,
       * so we cast to TEXT for safe ID handling in resume operations.
       */
      const insertResult = this.durableState.storage.sql.exec(
        `INSERT INTO "${this.schemaPrefix}events" (payload, target_ids, exclusion_ids) VALUES (?, ?, ?) RETURNING CAST(id AS TEXT) as id`,
        serializedEvent,
        stringifyJSON(targetIds),
        stringifyJSON(excludeIds),
      )

      const id = insertResult.one()?.id as string
      return this.withEventId(payload, id)
    }

    try {
      return insertEvent()
    }
    catch {
      /**
       * In the error case, like full disk, exceeding the max number of rows, etc.,
       * we reset the schema and try to insert again.
       * This can lead to data loss, but it's better than failing the entire operation.
       */
      this.resetSchema()
      return insertEvent()
    }
  }

  /**
   * Get events after lastEventId for a specific websocket
   */
  get(
    websocket: DurableEventIteratorWebsocket,
    lastEventId: string,
  ): TEventPayload[] {
    if (!this.isEnabled) {
      return []
    }

    const websocketId = websocket['~orpc'].deserializeTokenPayload().id

    /**
     * SQLite INTEGER can exceed JavaScript's safe integer range,
     * so we cast to TEXT for safe resume ID comparison.
     */
    const resumeQuery = this.durableState.storage.sql.exec(`
      SELECT CAST(id AS TEXT) as id, payload, targets, exclusions
      FROM "${this.schemaPrefix}events"
      WHERE id > ?
      ORDER BY id ASC
    `, lastEventId)

    return resumeQuery
      .toArray()
      .filter((resumeRecord: Record<string, any>) => {
        const resumeTargetIds = parseEmptyableJSON(resumeRecord.targets) as string[] | undefined
        const resumeExclusionIds = parseEmptyableJSON(resumeRecord.exclusions) as string[] | undefined

        if (resumeTargetIds && !resumeTargetIds.includes(websocketId)) {
          return false
        }

        if (resumeExclusionIds && resumeExclusionIds.includes(websocketId)) {
          return false
        }

        return true
      })
      .map((resumeRecord: Record<string, any>) => this.withEventId(
        this.deserializeEventPayload(resumeRecord.payload),
        resumeRecord.id,
      ))
  }

  private initSchema(): void {
    this.durableState.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS "${this.schemaPrefix}events" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payload TEXT NOT NULL,
        target_ids TEXT,
        exclusion_ids TEXT,
        stored_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `)

    this.durableState.storage.sql.exec(`
      CREATE INDEX IF NOT EXISTS "${this.schemaPrefix}idx_events_id" ON "${this.schemaPrefix}events" (id)
    `)

    this.durableState.storage.sql.exec(`
      CREATE INDEX IF NOT EXISTS "${this.schemaPrefix}idx_events_stored_at" ON "${this.schemaPrefix}events" (stored_at)
    `)
  }

  private resetSchema(): void {
    this.durableState.storage.sql.exec(`
      DROP TABLE IF EXISTS "${this.schemaPrefix}events"
    `)

    this.initSchema()
  }

  private cleanupExpiredEvents(): void {
    this.durableState.storage.sql.exec(`
      DELETE FROM "${this.schemaPrefix}events" WHERE stored_at < unixepoch() - ?
    `, this.retentionSeconds)
  }

  private serializeEventPayload(payload: TEventPayload): string {
    const eventMeta = getEventMeta(payload)
    const [json, meta] = this.serializer.serialize({ payload, meta: eventMeta })
    return stringifyJSON({ json, meta })
  }

  private deserializeEventPayload(payload: string): TEventPayload {
    const { json, meta } = JSON.parse(payload)
    const { payload: deserializedPayload, meta: eventMeta } = this.serializer.deserialize(json, meta) as {
      payload: TEventPayload
      meta: ReturnType<typeof getEventMeta>
    }

    return eventMeta ? withEventMeta(deserializedPayload, eventMeta) : deserializedPayload
  }

  private withEventId(payload: TEventPayload, id: string): TEventPayload {
    return withEventMeta(payload, {
      ...getEventMeta(payload),
      id,
    })
  }
}
