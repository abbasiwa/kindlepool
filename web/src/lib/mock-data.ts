export interface MockPool {
  id: number
  title: string
  creator: string
  creatorAddress: string
  description: string
  goal: number
  raised: number
  supporters: { address: string; amount: number }[]
  deadline: number
  status: 'open' | 'vote' | 'paid' | 'expired'
  category: string
  workHash: string | null
  voteDeadline: number | null
}

export const MOCK_POOLS: MockPool[] = [
  {
    id: 1,
    title: 'Digital Portrait Commission',
    creator: '@artbymaya',
    creatorAddress: 'GAX23...27RC',
    description: 'I will paint a digital portrait of anyone who funds this pool. High resolution, fully colored, delivered in 5 business days.',
    goal: 500,
    raised: 340,
    supporters: [
      { address: 'GABC...1234', amount: 100 },
      { address: 'GDEF...5678', amount: 200 },
      { address: 'GHIJ...9012', amount: 40 },
    ],
    deadline: 3,
    status: 'open',
    category: 'art',
    workHash: null,
    voteDeadline: null,
  },
  {
    id: 2,
    title: 'Short Story Collection',
    creator: '@wordsmith',
    creatorAddress: 'GBCD...3456',
    description: 'A collection of three short sci-fi stories exploring AI consciousness. 10k words total.',
    goal: 300,
    raised: 300,
    supporters: [
      { address: 'GKLM...7890', amount: 100 },
      { address: 'GNOP...1234', amount: 100 },
      { address: 'GQRS...5678', amount: 100 },
    ],
    deadline: 1,
    status: 'vote',
    category: 'writing',
    workHash: 'QmX...abc123',
    voteDeadline: 172800,
  },
  {
    id: 3,
    title: 'Ambient Music EP',
    creator: '@sonicbloom',
    creatorAddress: 'GTUV...9012',
    description: 'A 4-track ambient EP for relaxation and focus. Soft pads, field recordings, gentle melodies.',
    goal: 800,
    raised: 220,
    supporters: [
      { address: 'GWXY...3456', amount: 100 },
      { address: 'GZAB...7890', amount: 70 },
      { address: 'GCDE...1234', amount: 50 },
    ],
    deadline: 7,
    status: 'open',
    category: 'music',
    workHash: null,
    voteDeadline: null,
  },
  {
    id: 4,
    title: 'Pixel Art Tileset',
    creator: '@pixelwizard',
    creatorAddress: 'GFGH...5678',
    description: 'A 16x16 pixel art tileset for game development. 100+ tiles including terrain, objects, and characters.',
    goal: 200,
    raised: 50,
    supporters: [
      { address: 'GIJK...9012', amount: 50 },
    ],
    deadline: 14,
    status: 'open',
    category: 'art',
    workHash: null,
    voteDeadline: null,
  },
  {
    id: 5,
    title: 'Sci-Fi Novel Chapter',
    creator: '@stellarauthor',
    creatorAddress: 'GLMN...3456',
    description: 'First chapter of a cyberpunk novel set in a post-AI society. 5k words, professional editing included.',
    goal: 600,
    raised: 600,
    supporters: [
      { address: 'GOPQ...7890', amount: 200 },
      { address: 'GRST...1234', amount: 150 },
      { address: 'GUVW...5678', amount: 150 },
      { address: 'GYZA...9012', amount: 100 },
    ],
    deadline: 2,
    status: 'vote',
    category: 'writing',
    workHash: 'QmY...def456',
    voteDeadline: 86400,
  },
  {
    id: 6,
    title: 'Podcast Episode Script',
    creator: '@storyteller',
    creatorAddress: 'GBCD...2468',
    description: 'A 30-minute narrative podcast script about forgotten inventors. Fully researched and ready to record.',
    goal: 150,
    raised: 150,
    supporters: [
      { address: 'GDEF...1357', amount: 100 },
      { address: 'GHIJ...9753', amount: 50 },
    ],
    deadline: 5,
    status: 'paid',
    category: 'writing',
    workHash: 'QmZ...ghi789',
    voteDeadline: 259200,
  },
]

export function getPoolById(id: number): MockPool | undefined {
  return MOCK_POOLS.find((p) => p.id === id)
}
