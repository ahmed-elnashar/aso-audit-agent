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
  title: 18,
  subtitle: 14,
  keywords: 14,
  description: 10,
  screenshots: 14,
  previewVideo: 4,
  ratings: 14,
  icon: 4,
  conversion: 4,
  competitive: 4,
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
  screenshotUrls: string[];
  ipadScreenshotUrls: string[];
  averageRating: number | null;
  ratingCount: number | null;
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
