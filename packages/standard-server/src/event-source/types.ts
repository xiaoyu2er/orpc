export interface EventMessage {
  event: string | undefined
  id: string | undefined
  data: string

  /**
   * The number of milliseconds to wait before retrying the event source if error occurs.
   */
  retry: number | undefined
}
