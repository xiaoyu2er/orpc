export class SequentialIdGenerator {
  private nextId = 0

  generate(): number {
    if (this.nextId === Number.MAX_SAFE_INTEGER) {
      this.nextId = 0
      return Number.MAX_SAFE_INTEGER
    }

    return this.nextId++
  }
}
