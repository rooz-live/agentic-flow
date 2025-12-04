import { InteractionResponseType, InteractionType, verifyKey, } from 'discord-interactions';
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        // Health check endpoint
        if (url.pathname === '/api/discord/health') {
            return new Response(JSON.stringify({ status: 'ok', env: env.ENVIRONMENT }), {
                headers: { 'content-type': 'application/json' },
            });
        }
        // Interaction endpoint
        if (request.method === 'POST' && url.pathname === '/api/discord') {
            return handleInteraction(request, env);
        }
        return new Response('Not Found', { status: 404 });
    },
};
async function handleInteraction(request, env) {
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const body = await request.text();
    if (!signature || !timestamp || !env.DISCORD_PUBLIC_KEY) {
        return new Response('Bad Request signature', { status: 401 });
    }
    const isValidRequest = verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
    if (!isValidRequest) {
        return new Response('Bad Request signature validation failed', { status: 401 });
    }
    const interaction = JSON.parse(body);
    if (interaction.type === InteractionType.PING) {
        return new Response(JSON.stringify({ type: InteractionResponseType.PONG }), {
            headers: { 'content-type': 'application/json' },
        });
    }
    // Handle other interactions here
    // For MVP, we just acknowledge PING
    return new Response(JSON.stringify({ type: InteractionResponseType.PONG }), {
        headers: { 'content-type': 'application/json' },
    });
}
//# sourceMappingURL=discord_worker.js.map