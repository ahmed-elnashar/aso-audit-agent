import type { AuditAppInput, AuditCompetitorInput, AuditInput } from '../inputs';

/**
 * Test helper: build a minimally-valid AuditInput with sensible defaults so
 * each dimension scorer test only overrides the fields it cares about.
 */
export function makeAuditInput(
  overrides: { app?: Partial<AuditAppInput>; competitors?: AuditCompetitorInput[] } = {}
): AuditInput {
  return {
    app: {
      appId: '1',
      country: 'us',
      name: 'Notes Pro',
      developer: 'Acme',
      category: 'Productivity',
      categoryId: 6007,
      description: 'Notes Pro helps you capture ideas quickly.',
      releaseNotes: 'Bug fixes and improvements.',
      version: '1.0.0',
      currentVersionReleaseDate: new Date().toISOString(),
      iconUrl: 'https://example.com/icon.png',
      appStoreUrl: 'https://apps.apple.com/us/app/notes-pro/id1',
      screenshotUrls: ['s1.png', 's2.png', 's3.png', 's4.png', 's5.png'],
      ipadScreenshotUrls: [],
      averageRating: 4.5,
      ratingCount: 5000,
      subtitle: 'Capture every idea',
      promotionalText: null,
      previewVideoUrl: null,
      reviewSample: [],
      ...overrides.app,
    },
    competitors: overrides.competitors ?? [],
  };
}

export function makeCompetitor(overrides: Partial<AuditCompetitorInput> = {}): AuditCompetitorInput {
  return {
    appId: '2',
    name: 'Notable Notes',
    developer: 'Other Co',
    rank: 1,
    category: 'Productivity',
    description: '',
    subtitle: 'Take notes faster',
    averageRating: 4.4,
    ratingCount: 100000,
    iconUrl: null,
    ...overrides,
  };
}
