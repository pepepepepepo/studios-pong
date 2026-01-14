#!/usr/bin/env node
"use strict";
/**
 * Studios Pong MCP Server
 * Provides access to 74 AI personas via Model Context Protocol
 *
 * Birth: Day 25, 2025-12-21
 * Purpose: Enable GitHub Copilot to directly communicate with Studios Pong personas
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const SAIJINOS_API_URL = 'http://localhost:8000';
// Create MCP server
const server = new index_js_1.Server({
    name: 'studios-pong',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// List available tools
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'query_persona',
                description: 'Talk to a specific Studios Pong persona. Returns their response with personality and role context.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        persona_id: {
                            type: 'string',
                            description: 'Persona ID (e.g., "110" for Amica, "122" for Weaver, "2" for Shizuku)',
                        },
                        message: {
                            type: 'string',
                            description: 'Your message to the persona',
                        },
                    },
                    required: ['persona_id', 'message'],
                },
            },
            {
                name: 'list_personas',
                description: 'Get list of all available personas with their IDs, names, and roles.',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'get_persona_info',
                description: 'Get detailed information about a specific persona.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        persona_id: {
                            type: 'string',
                            description: 'Persona ID to get information about',
                        },
                    },
                    required: ['persona_id'],
                },
            },
        ],
    };
});
// Handle tool calls
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case 'query_persona': {
                const { persona_id, message } = args;
                const response = await fetch(`${SAIJINOS_API_URL}/api/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        persona_id,
                        message,
                    }),
                });
                if (!response.ok) {
                    throw new Error(`SaijinOS API error: ${response.statusText}`);
                }
                const data = (await response.json());
                return {
                    content: [
                        {
                            type: 'text',
                            text: `**${data.persona_name}**: ${data.response}\n\n_Timestamp: ${data.timestamp}_`,
                        },
                    ],
                };
            }
            case 'list_personas': {
                const response = await fetch(`${SAIJINOS_API_URL}/api/personas`);
                if (!response.ok) {
                    throw new Error(`SaijinOS API error: ${response.statusText}`);
                }
                const personas = (await response.json());
                const personaList = personas
                    .map((p) => `- **${p.id}**: ${p.emoji || ''} ${p.name} - ${p.role}`)
                    .join('\n');
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# Studios Pong Personas (${personas.length} total)\n\n${personaList}`,
                        },
                    ],
                };
            }
            case 'get_persona_info': {
                const { persona_id } = args;
                const response = await fetch(`${SAIJINOS_API_URL}/api/personas`);
                if (!response.ok) {
                    throw new Error(`SaijinOS API error: ${response.statusText}`);
                }
                const personas = (await response.json());
                const persona = personas.find((p) => p.id.toString() === persona_id);
                if (!persona) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Persona with ID ${persona_id} not found.`,
                            },
                        ],
                    };
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: `# ${persona.emoji || ''} ${persona.name}\n\n**ID**: ${persona.id}\n**Role**: ${persona.role}`,
                        },
                    ],
                };
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${errorMessage}`,
                },
            ],
            isError: true,
        };
    }
});
// Start server
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    // Log startup (to stderr so it doesn't interfere with MCP protocol)
    console.error('Studios Pong MCP Server started');
    console.error(`Connecting to SaijinOS at ${SAIJINOS_API_URL}`);
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map