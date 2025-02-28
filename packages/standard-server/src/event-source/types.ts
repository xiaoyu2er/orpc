export interface EventMessage {
  event: string | undefined
  id: string | undefined
  data: string | undefined

  /**
   * The number of milliseconds to wait before retrying the event source if error occurs.
   */
  retry: number | undefined

  comments: string[]
}
