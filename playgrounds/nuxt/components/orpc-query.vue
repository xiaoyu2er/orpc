<script setup lang="ts">
import { useInfiniteQuery } from '@tanstack/vue-query'
import { orpc } from '~/lib/orpc'

const query = useInfiniteQuery(orpc.planet.list.infiniteOptions({
  input: {},
  getNextPageParam: lastPage => (lastPage.at(-1)?.id ?? -1) + 1,
}))
</script>

<template>
  <h2>oRPC and Tanstack Query | List Planets example</h2>

  <div v-if="query.status.value === 'pending'">
    Loading...
  </div>
  <div v-else-if="query.status.value === 'error'">
    Something went wrong.
  </div>
  <div v-else>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Description</th>
          <th>Image</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="planet in query.data.value?.pages.flatMap(page => page)" :key="planet.id">
          <td>{{ planet.id }}</td>
          <td>{{ planet.name }}</td>
          <td>{{ planet.description }}</td>
          <td>{{ planet.imageUrl }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4">
            <button type="button" @click="() => query.fetchNextPage()">
              Load more
            </button>
            <button type="button" @click="() => query.refetch()">
              Refresh
            </button>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>
