import type { Dimension } from './types';

/** Human-readable labels for each audit dimension. Used in score cards,
 *  exports, and any UI that has room for the full phrase. Typed as a
 *  `Record<Dimension, string>` so adding a new dimension to `DIMENSIONS`
 *  forces an update here. */
export const DIMENSION_LABELS: Record<Dimension, string> = {
  title: 'Title',
  subtitle: 'Subtitle',
  keywords: 'Keyword field',
  description: 'Description',
  screenshots: 'Screenshots',
  previewVideo: 'Preview video',
  ratings: 'Ratings & reviews',
  icon: 'Icon',
  conversion: 'Conversion signals',
  competitive: 'Competitive position',
};

/** Short labels for the recommendation-row pill badges where the full phrase
 *  would wrap or overflow. Falls back to the full label for dimensions that
 *  don't need a shorter form. */
export const DIMENSION_SHORT_LABELS: Record<Dimension, string> = {
  ...DIMENSION_LABELS,
  keywords: 'Keywords',
  ratings: 'Ratings',
  conversion: 'Conversion',
  competitive: 'Competitive',
};
