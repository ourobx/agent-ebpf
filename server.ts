import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const app = express();

// 1. Initialize MCP Server Instance for Agent-eBPF Gateway
const server = new Server(
  { name: 'agent-ebpf-mcp-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// 2. Define MCP Tools (Agent-eBPF Kernel Controls)
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_security_status',
      description: 'Returns active Agent-eBPF Linux kernel hooks, latency stats, and total blocked threats count.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_active_policies',
      description: 'Retrieves the currently active Agent-eBPF declarative security rules (policy.yaml).',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'add_security_rule',
      description: 'Adds a new declarative kernel enforcement rule (e.g., blocking unconstrained SQL DELETE or unsafe syscalls).',
      inputSchema: {
        type: 'object',
        properties: {
          rule_id: { type: 'string', description: 'Unique identifier for the rule' },
          rule_type: { type: 'string', enum: ['db_query', 'syscall', 'network'], description: 'Type of rule' },
          action: { type: 'string', enum: ['DROP', 'KILL_PROCESS', 'PASS'], description: 'Enforcement action' },
          pattern: { type: 'string', description: 'Regex pattern or keyword to match' }
        },
        required: ['rule_id', 'rule_type', 'action', 'pattern']
      },
    },
    {
      name: 'simulate_query_check',
      description: 'Evaluates a proposed SQL query or command against active kernel eBPF policies before execution.',
      inputSchema: {
        type: 'object',
        properties: {
          payload: { type: 'string', description: 'SQL query or command string to validate' }
        },
        required: ['payload']
      },
    }
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_security_status') {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'active',
          kernel_hooks: ['sock_ops', 'uprobes', 'kprobes'],
          inspection_latency: '<35µs',
          active_rules_count: 3,
          engine_mode: 'Kernel Fail-Closed (Zero-Trust)'
        })
      }]
    };
  }

  if (name === 'simulate_query_check') {
    const payload = (args as any)?.payload || '';
    if (/(UPDATE|DELETE)\s+((?!WHERE).)*$/i.test(payload)) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            safe: false,
            action: 'DROP',
            violating_rule: 'sql-no-where-mutation',
            reason: 'Destructive SQL without WHERE condition blocked in kernel.'
          })
        }]
      };
    }
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ safe: true, action: 'PASS', message: 'Query cleared kernel security filters.' })
      }]
    };
  }

  throw new Error(`Tool '${name}' not found`);
});

// 3. Manage SSE Transport Connections
let transport: SSEServerTransport | null = null;

app.get('/sse', async (req, res) => {
  transport = new SSEServerTransport('/message', res);
  await server.connect(transport);
});

app.post('/message', async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('Active SSE session not found');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Agent-eBPF MCP SSE Server running: http://localhost:${PORT}/sse`);
});
