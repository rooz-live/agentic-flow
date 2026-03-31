import { UnconfiguredLionrsAdapter } from '../../src/core/lionrs/adapter';

describe('lionrs adapter scaffold', () => {
  test('unconfigured adapter throws with planned spawn details', async () => {
    const adapter = new UnconfiguredLionrsAdapter();
    await expect(
      adapter.spawn({ risk: { category: 'security', severity: 'medium', complexity: 5 } }),
    ).rejects.toThrow(/lionrs adapter not configured/);
  });
});
