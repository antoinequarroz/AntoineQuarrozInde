import { previewPipelineReminders } from '../../../utils/pipelineReminders'

export default defineEventHandler(async (event) => {
  const { org } = await requireAdmin(event)
  return await previewPipelineReminders(org.id)
})
