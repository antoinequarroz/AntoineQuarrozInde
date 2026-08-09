import { runPipelineReminders } from '../../../utils/pipelineReminders'

export default defineEventHandler(async (event) => {
  const { org, user } = await requireAdmin(event)
  return await runPipelineReminders({
    organizationId: org.id,
    actorUserId: user?.id || null,
    actorEmail: user?.email || null,
    trigger: 'manual',
  })
})
