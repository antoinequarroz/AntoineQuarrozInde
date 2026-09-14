<script setup lang="ts">
import AdminCrmWorkspace from '~/components/admin/CrmWorkspace.vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'CRM clients — Administration' })
</script>

<template>
  <AdminCrmWorkspace />
</template>
