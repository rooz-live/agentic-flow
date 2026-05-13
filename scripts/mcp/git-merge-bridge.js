#!/usr/bin/env node
/**
 * Sovereign Swarm: Git-Merge MCP Bridge (Canvas / Designer Phase Gate)
 * Exposes a local tool allowing the AI Swarm to automatically apply a git-merge
 * straight to the physical IDE workspace upon user approval.
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { execSync } = require("child_process");

const server = new Server(
    { name: "git-merge-bridge", version: "1.0.0" },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "apply_git_merge",
                description: "Applies a physical git-merge of the agent's staged diffs into the active IDE workspace.",
                inputSchema: {
                    type: "object",
                    properties: {
                        patch_content: { type: "string", description: "The physical diff/patch content to apply." },
                        target_file: { type: "string", description: "Path to the target file." }
                    },
                    required: ["patch_content", "target_file"]
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "apply_git_merge") {
        const { patch_content, target_file } = request.params.arguments;
        try {
            // Write to a temporary patch file
            const fs = require('fs');
            const path = '/tmp/swarm_physical_merge.patch';
            fs.writeFileSync(path, patch_content);
            
            // Execute the physical merge
            console.error(`[MCP Git Bridge] Applying merge to ${target_file}`);
            const result = execSync(`git apply ${path}`).toString();
            
            return {
                content: [{ type: "text", text: `Merge successfully physicalized to ${target_file}. ${result}` }]
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Merge failed: ${error.message}` }],
                isError: true
            };
        }
    }
    throw new Error("Tool not found");
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Git-Merge MCP Bridge running on stdio");
}

main().catch(console.error);
