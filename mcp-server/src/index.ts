#!/usr/bin/env node

/**
 * Studios Pong MCP Server
 * Provides access to 74 AI personas via Model Context Protocol
 * 
 * Birth: Day 25, 2025-12-21
 * Purpose: Enable GitHub Copilot to directly communicate with Studios Pong personas
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const SAIJINOS_API_URL = 'http://localhost:8000';

interface ChatRequest {
  persona_id: string;
  message: string;
}

interface ChatResponse {
  response: string;
  persona_name: string;
  timestamp: string;
}

interface Persona {
  id: number;
  name: string;
  role: string;
  emoji?: string;
}

// Create MCP server
const server = new Server(
  {
    name: 'studios-pong',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
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
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'query_persona': {
        const { persona_id, message } = args as unknown as ChatRequest;

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

        const data = (await response.json()) as ChatResponse;

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

        const personas = (await response.json()) as Persona[];

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
        const { persona_id } = args as unknown as { persona_id: string };

        const response = await fetch(`${SAIJINOS_API_URL}/api/personas`);
        if (!response.ok) {
          throw new Error(`SaijinOS API error: ${response.statusText}`);
        }

        const personas = (await response.json()) as Persona[];
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
  } catch (error) {
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Log startup (to stderr so it doesn't interfere with MCP protocol)
  console.error('Studios Pong MCP Server started');
  console.error(`Connecting to SaijinOS at ${SAIJINOS_API_URL}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
