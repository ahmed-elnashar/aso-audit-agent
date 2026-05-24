import { z } from 'zod';

export const DIMENSIONS = [
  'title',
  'subtitle',
  'keywords',
  'description',
  'screenshots',
  'previewVideo',
  'ratings',
  'icon',
  'conversion',
  'competitive',
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

export const DIMENSION_WEIGHTS: Record<Dimension, number> = {
  title: 20,
  subtitle: 15,
  keywords: 15,
  description: 10,
  screenshots: 15,
  previewVideo: 5,
  ratings: 15,
  icon: 5,
  conversion: 5,
  competitive: 5,
};

export const RECOMMENDATION_CATEGORIES = ['quick-win', 'high-impact', 'strategic'] as const;
export type RecommendationCategory = (typeof RECOMMENDATION_CATEGORIES)[number];

export const RecommendationSchema = z.object({
  dimension: z.enum(DIMENSIONS),
  category: z.enum(RECOMMENDATION_CATEGORIES),
  evidence: z.string(),
  before: z.string().nullable(),
  after: z.string().nullable(),
  reasoning: z.string(),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export interface DimensionResult {
  dimension: Dimension;
  weight: number;
  score: number | null;
  evidence: string[];
  recommendations: Recommendation[];
  status: 'assessed' | 'unavailable';
  unavailableReason?: string;
}

export interface AppSummary {
  appId: string;
  name: string;
  developer: string;
  category: string;
  country: string;
  iconUrl: string | null;
  appStoreUrl: string;
  version: string | null;
  currentVersionReleaseDate: string | null;
}

export interface CompetitorSummary {
  appId: string;
  name: string;
  developer: string;
  rank: number;
  averageRating: number | null;
  ratingCount: number | null;
  subtitle: string | null;
  iconUrl: string | null;
}

export interface AuditReport {
  app: AppSummary;
  overallScore: number;
  dimensions: DimensionResult[];
  competitors: CompetitorSummary[];
  quickWins: Recommendation[];
  highImpact: Recommendation[];
  strategic: Recommendation[];
  generatedAt: string;
}
