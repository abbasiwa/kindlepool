export interface PoolTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: string
  defaultGoal: number
  defaultDeadline: number
  suggestedMilestones: readonly { readonly label: string; readonly percent: number }[]
  descriptionHint: string
}

export const POOL_TEMPLATES: readonly PoolTemplate[] = [
  {
    id: 'art-commission', name: 'Art Commission',
    description: 'Create a digital or traditional artwork for a patron',
    icon: '🎨', category: 'art', defaultGoal: 500, defaultDeadline: 14,
    suggestedMilestones: [
      { label: 'Sketch / Concept', percent: 30 },
      { label: 'Coloring / Refinement', percent: 30 },
      { label: 'Final Delivery', percent: 40 },
    ] as const,
    descriptionHint: 'Describe the style, size, medium, and subject matter...',
  },
  {
    id: 'writing-piece', name: 'Writing / Article',
    description: 'Write an article, story, or essay',
    icon: '✍️', category: 'writing', defaultGoal: 300, defaultDeadline: 10,
    suggestedMilestones: [
      { label: 'Outline & Research', percent: 20 },
      { label: 'First Draft', percent: 30 },
      { label: 'Final Polish', percent: 50 },
    ] as const,
    descriptionHint: 'Describe the topic, tone, length, and target audience...',
  },
  {
    id: 'music-track', name: 'Music Track',
    description: 'Produce an original music track or beat',
    icon: '🎵', category: 'music', defaultGoal: 800, defaultDeadline: 21,
    suggestedMilestones: [
      { label: 'Demo / Rough Mix', percent: 25 },
      { label: 'Arrangement & Production', percent: 25 },
      { label: 'Mastering & Delivery', percent: 50 },
    ] as const,
    descriptionHint: 'Describe the genre, mood, instruments, and reference tracks...',
  },
  {
    id: 'code-library', name: 'Open Source Library',
    description: 'Build a reusable library, tool, or component',
    icon: '💻', category: 'code', defaultGoal: 1000, defaultDeadline: 30,
    suggestedMilestones: [
      { label: 'Architecture & Design', percent: 20 },
      { label: 'Core Implementation', percent: 40 },
      { label: 'Tests & Documentation', percent: 40 },
    ] as const,
    descriptionHint: 'Describe the functionality, tech stack, target users...',
  },
  {
    id: 'photo-set', name: 'Photo Set',
    description: 'Shoot and edit a set of photographs',
    icon: '📷', category: 'art', defaultGoal: 400, defaultDeadline: 14,
    suggestedMilestones: [
      { label: 'Concept & Scouting', percent: 20 },
      { label: 'Photo Session', percent: 40 },
      { label: 'Editing & Delivery', percent: 40 },
    ] as const,
    descriptionHint: 'Describe the theme, location, number of photos, style...',
  },
  {
    id: 'podcast-episode', name: 'Podcast Episode',
    description: 'Record and produce a podcast episode',
    icon: '🎙️', category: 'writing', defaultGoal: 200, defaultDeadline: 10,
    suggestedMilestones: [
      { label: 'Script & Research', percent: 30 },
      { label: 'Recording', percent: 30 },
      { label: 'Editing & Publishing', percent: 40 },
    ] as const,
    descriptionHint: 'Describe the topic, format, length, and guests...',
  },
  {
    id: 'custom', name: 'Custom Project',
    description: 'Start from scratch with your own settings',
    icon: '✨', category: 'other', defaultGoal: 500, defaultDeadline: 14,
    suggestedMilestones: [
      { label: 'Milestone 1', percent: 33 },
      { label: 'Milestone 2', percent: 33 },
      { label: 'Milestone 3', percent: 34 },
    ] as const,
    descriptionHint: 'Describe your project in detail...',
  },
]

export function getTemplateById(id: string): PoolTemplate | undefined {
  return POOL_TEMPLATES.find((t) => t.id === id)
}

export function getTemplatesByCategory(category: string): PoolTemplate[] {
  return POOL_TEMPLATES.filter((t) => t.category === category || t.id === 'custom').slice(0, 4)
}

export function cloneMilestones(
  ms: readonly { readonly label: string; readonly percent: number }[],
): { label: string; percent: number }[] {
  return ms.map((m) => ({ label: m.label, percent: m.percent }))
}
