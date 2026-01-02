export interface Env {
    DISCORD_PUBLIC_KEY: string;
    DISCORD_APPLICATION_ID: string;
    DISCORD_BOT_TOKEN: string;
    ENVIRONMENT: string;
}
declare const _default: {
    fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response>;
};
export default _default;
//# sourceMappingURL=discord_worker.d.ts.map