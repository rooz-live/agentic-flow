/**
 * LLMLingua Prompt Compression Middleware
 * Reduces token consumption for AgentDB historical reflection injection
 */
export class LLMLinguaCompressor {
    baseUri;
    constructor(baseUri = 'http://localhost:5000') {
        this.baseUri = baseUri;
    }
    /**
     * Compresses the provided prompt context (e.g. historical ReflexionMemory trajectories)
     * using an external LLMLingua service. If the service is unreachable, falls back to
     * heuristic text summarization.
     */
    async compressPrompt(prompt, options = {}) {
        const targetRatio = options.targetRatio || 0.5;
        try {
            // Attempt API call to LLMLingua backend
            const response = await fetch(`${this.baseUri}/compress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    context: [prompt],
                    target_token_ratio: targetRatio,
                    // Instruct LLMLingua to preserve critical domain terms
                    instruction: options.instruction || "Preserve critical medical and coding terminologies."
                })
            });
            if (response.ok) {
                const data = await response.json();
                return {
                    originalText: prompt,
                    compressedText: data.compressed_content || this.heuristicFallback(prompt, targetRatio),
                    originalTokens: data.origin_tokens || prompt.length / 4,
                    compressedTokens: data.compressed_tokens || (prompt.length / 4) * targetRatio,
                    ratio: targetRatio
                };
            }
            else {
                throw new Error('LLMLingua API returned error status');
            }
        }
        catch (error) {
            // console.warn('LLMLingua compression service unreachable, utilizing heuristic fallback', error);
            const fallbackText = this.heuristicFallback(prompt, targetRatio);
            return {
                originalText: prompt,
                compressedText: fallbackText,
                originalTokens: Math.ceil(prompt.length / 4),
                compressedTokens: Math.ceil(fallbackText.length / 4),
                ratio: fallbackText.length / prompt.length
            };
        }
    }
    /**
     * Local heuristic fallback when the LLMLingua Python microservice isn't running.
     * Strips stop-words, reduces whitespace, and caps length.
     */
    heuristicFallback(text, ratio) {
        // 1. Remove excessive whitespace
        let compressed = text.replace(/\s+/g, ' ').trim();
        // 2. Strip common stop words (quick heuristic)
        const stopWords = ['the', 'is', 'at', 'which', 'on', 'for', 'a', 'an', 'and', 'to', 'in', 'that', 'it', 'with'];
        const regex = new RegExp(`\\b(${stopWords.join('|')})\\b`, 'gi');
        compressed = compressed.replace(regex, '');
        compressed = compressed.replace(/\s+/g, ' ').trim();
        // 3. Hard-truncate if needed based on target ratio
        const targetLength = Math.floor(text.length * ratio);
        if (compressed.length > targetLength) {
            compressed = compressed.substring(0, targetLength) + '...';
        }
        return compressed;
    }
}
//# sourceMappingURL=llmlingua-compressor.js.map