import { Client, GatewayIntentBits, Message } from 'discord.js';
import * as fs from 'fs';
import * as yaml from 'yaml';
import fetch from 'node-fetch';

// WSJF-Cycle-65: Discord Bot Proxy
// Bounds: MCP interface limits mapping 4K chunking.

interface BotConfig {
    interface_bridges: {
        discord: {
            chunking_limit_bytes: number;
            command_prefix: string;
        }
    };
    agentic_telemetry: {
        primary_llm_runtime: {
            host: string;
            models: Array<{ name: string; context_limit: number }>;
        }
    }
}

class DiscordOllamaProxy {
    private client: Client;
    private config: BotConfig;
    private ollamaHost: string;
    private chunkLimit: number;
    private prefix: string;

    constructor(configPath: string) {
        const fileStr = fs.readFileSync(configPath, 'utf8');
        this.config = yaml.parse(fileStr);
        this.chunkLimit = this.config.interface_bridges.discord.chunking_limit_bytes || 4000;
        this.prefix = this.config.interface_bridges.discord.command_prefix || '!discbot';
        this.ollamaHost = this.config.agentic_telemetry.primary_llm_runtime.host || 'http://localhost:11434';
        
        this.client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
        });

        this.initHandlers();
    }

    private initHandlers() {
        this.client.on('messageCreate', async (message: Message) => {
            if (message.author.bot || !message.content.startsWith(this.prefix)) return;
            
            const prompt = message.content.slice(this.prefix.length).trim();
            if (!prompt) return;

            try {
                const llmResponse = await this.queryOllama(prompt);
                await this.sendChunkedResponse(message, llmResponse);
            } catch (err) {
                console.error("Inference Error:", err);
                message.reply("Proxy offline. Verify Ollama port 11434 state.");
            }
        });
    }

    private async queryOllama(prompt: string): Promise<string> {
        const response = await fetch(`${this.ollamaHost}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'neural-trader-instruct',
                prompt: prompt,
                stream: false
            })
        });

        if (!response.ok) throw new Error("Ollama Gateway Rejected.");
        const data = await response.json();
        return data.response;
    }

    private async sendChunkedResponse(message: Message, text: string) {
        // Enforce 4K Discord message limit mappings.
        for (let i = 0; i < text.length; i += this.chunkLimit) {
            await message.reply(text.substring(i, i + this.chunkLimit));
        }
    }

    public login(token: string) {
        this.client.login(token);
    }
}

export default DiscordOllamaProxy;
