/**
 * Agent Builder
 * Creates LangChain agents with tools and prompts
 * Uses LangChain v1.0 official createAgent API
 * Reference: https://docs.langchain.com/oss/javascript/langchain/overview
 */

const { createAgent, tool } = require('langchain');
const { logAgentExecution } = require('../../utils/vector');

/**
 * Build a LangChain agent with tools
 * @param {Object} config
 * @param {ChatOpenAI} config.llm - LLM instance (used as model)
 * @param {Array} config.tools - Array of tool definitions
 * @param {string} config.systemPrompt - System prompt text
 * @param {string} config.agentType - Agent type for logging
 * @param {number} config.maxIterations - Max tool call iterations (not used directly, handled by LangChain)
 * @returns {Agent} LangChain agent with logging wrapper
 */
async function buildAgent({ llm, tools, systemPrompt, agentType = 'unknown', maxIterations = 6 }) {
  // Convert tools to LangChain tool format using the official `tool` helper
  const langchainTools = tools.map(toolDef => {
    // Use LangChain's tool helper for proper tool creation
    return tool(
      async args => {
        try {
          const result = await toolDef.func(args);
          return typeof result === 'string' ? result : JSON.stringify(result);
        } catch (error) {
          return JSON.stringify({ error: error.message });
        }
      },
      {
        name: toolDef.name,
        description: toolDef.description,
        schema: toolDef.schema || {
          type: 'object',
          properties: {},
          required: [],
        },
      }
    );
  });

  // Create agent using official LangChain v1.0 API
  // Reference: https://docs.langchain.com/oss/javascript/langchain/overview
  const agent = createAgent({
    model: llm, // Pass the LLM instance directly
    tools: langchainTools,
    systemPrompt: systemPrompt,
  });

  // Wrap agent with logging
  const agentWithLogging = {
    async invoke(input, options = {}) {
      const startTime = Date.now();
      const userId = options.userId || null;
      const intermediateSteps = [];

      try {
        // Format input for LangChain agent
        // LangChain expects messages array format
        const messages =
          typeof input === 'string'
            ? [{ role: 'user', content: input }]
            : input.messages || [{ role: 'user', content: input.input || JSON.stringify(input) }];

        // Invoke agent
        const result = await agent.invoke({ messages });

        // Debug: Log message structure to understand LangChain's format
        console.log('🔍 LangChain result structure:', {
          hasMessages: !!result.messages,
          messageCount: result.messages?.length || 0,
          messageRoles: result.messages?.map((m, idx) => ({
            index: idx,
            role: m.role || m._getType?.() || m.constructor?.name || 'unknown',
            hasToolCalls: !!(m.tool_calls || m.toolCalls),
            hasContent: !!m.content,
            toolCallCount: (m.tool_calls || m.toolCalls)?.length || 0,
            allKeys: Object.keys(m).filter(k => !k.startsWith('_')),
            toolCallId: m.tool_call_id || m.toolCallId,
            toolCallIds: (m.tool_calls || m.toolCalls)?.map(tc => tc.id || tc.tool_call_id),
            contentPreview: typeof m.content === 'string' ? m.content.substring(0, 100) : typeof m.content,
          })) || [],
        });

        // Extract output and tool calls from result
        // LangChain v1.0 returns { messages: [...] } where messages include tool calls and responses
        
        // For scoring agents, prefer the tool output over the agent's final message
        // The agent should just pass through the tool result
        let output = '';
        let toolOutputFound = false;
        
        // Check if there's a tool result we should use instead of agent's final message
        // LangChain messages might not have 'role' property - check message type instead
        for (let idx = result.messages.length - 1; idx >= 0; idx--) {
          const msg = result.messages[idx];
          const msgType = msg.role || msg._getType?.() || msg.constructor?.name || 'unknown';
          const isToolMsg = msgType === 'tool' || msgType.includes('Tool') || msgType === 'ToolMessage' || 
                           (msg.content && !msg.tool_calls && idx > 0); // Message with content but no tool calls might be tool response
          
          if (isToolMsg && msg.content) {
            console.log(`🔍 Checking message ${idx} as potential tool output (type: ${msgType})`);
            // This is a tool result - use it as the output
            try {
              const toolContent = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
              // Check if it's JSON from score_answer tool
              const parsed = JSON.parse(toolContent);
              if (parsed.success && parsed.scores) {
                // This is the score_answer tool output - use it directly
                output = JSON.stringify(parsed.scores);
                toolOutputFound = true;
                console.log(`✅ Using tool output directly as agent output (from message ${idx})`);
                break;
              } else if (parsed.overall_score || parsed.dimension_scores) {
                // Direct score format from tool
                output = JSON.stringify(parsed);
                toolOutputFound = true;
                console.log(`✅ Using tool output directly (has scores, from message ${idx})`);
                break;
              }
            } catch (e) {
              // Not JSON, continue
              console.log(`  ⚠️ Message ${idx} content is not JSON: ${e.message.substring(0, 50)}`);
            }
          }
        }
        
        // Fallback to last message if no tool output found
        if (!toolOutputFound) {
          const lastMessage = result.messages[result.messages.length - 1];
          output = lastMessage?.content || '';
          console.log('⚠️ Using agent final message instead of tool output');
        }

        // Extract intermediate steps from messages
        // LangChain v1.0 might use different message structures - handle multiple formats
        // Messages might be: user, assistant (with tool_calls), tool (response), assistant (final)
        
        for (let idx = 0; idx < result.messages.length; idx++) {
          const msg = result.messages[idx];
          
          // Get message type/role - LangChain might use different properties
          const msgType = msg.role || msg._getType?.() || msg.constructor?.name || 'unknown';
          const isAssistant = msgType === 'assistant' || msgType.includes('Assistant') || msgType === 'AIMessage';
          const isTool = msgType === 'tool' || msgType.includes('Tool') || msgType === 'ToolMessage';

          // Check for tool calls in various formats
          const toolCalls = msg.tool_calls || msg.toolCalls || [];
          
          if (toolCalls.length > 0) {
            console.log(`🔍 Found ${toolCalls.length} tool call(s) in message ${idx} (type: ${msgType})`);
            
            // Find corresponding tool response messages
            for (const toolCall of toolCalls) {
              const toolCallId = toolCall.id || toolCall.tool_call_id;
              const toolName = toolCall.name || toolCall.function?.name;
              const toolArgs = toolCall.args || 
                (toolCall.function?.arguments 
                  ? (typeof toolCall.function.arguments === 'string' 
                      ? JSON.parse(toolCall.function.arguments)
                      : toolCall.function.arguments)
                  : {});

              console.log(`  🔍 Looking for tool response for ${toolName} (id: ${toolCallId})...`);

              // Look for tool response message (might be next message or later)
              // Tool response is usually the message after the assistant message with tool calls
              let toolResponse = null;
              for (let j = idx + 1; j < result.messages.length; j++) {
                const toolMsg = result.messages[j];
                const toolMsgType = toolMsg.role || toolMsg._getType?.() || toolMsg.constructor?.name || 'unknown';
                const isToolMsg = toolMsgType === 'tool' || toolMsgType.includes('Tool') || toolMsgType === 'ToolMessage';
                
                // Check if this is the corresponding tool response
                // Match by tool_call_id or by position (if it's the next message after tool call)
                const matchesId = toolMsg.tool_call_id === toolCallId || 
                                 toolMsg.toolCallId === toolCallId ||
                                 toolMsg.name === toolName;
                
                // Also check if it's a tool message with content (might not have tool_call_id set)
                if (isToolMsg && (matchesId || (j === idx + 1 && toolMsg.content))) {
                  toolResponse = toolMsg;
                  console.log(`  ✅ Found tool response at message ${j} (type: ${toolMsgType})`);
                  break;
                }
                
                // If we hit another assistant message, stop looking (tool response should be before it)
                const isNextAssistant = toolMsgType === 'assistant' || toolMsgType.includes('Assistant') || toolMsgType === 'AIMessage';
                if (isNextAssistant && j > idx + 1) {
                  break;
                }
              }

              if (toolResponse) {
                const toolContent = toolResponse.content || toolResponse.text || '';
                intermediateSteps.push({
                  action: {
                    tool: toolName,
                    tool_input: toolArgs,
                  },
                  observation: toolContent,
                });
                console.log(`✅ Extracted tool call: ${toolName} (response length: ${toolContent.length} chars)`);
              } else {
                console.warn(`⚠️ Tool call ${toolName} (id: ${toolCallId}) found but no corresponding tool response message`);
                // Try to use next message as tool response if it has content and no tool calls
                if (idx + 1 < result.messages.length) {
                  const nextMsg = result.messages[idx + 1];
                  const nextMsgType = nextMsg.role || nextMsg._getType?.() || nextMsg.constructor?.name || 'unknown';
                  const nextHasToolCalls = !!(nextMsg.tool_calls || nextMsg.toolCalls);
                  
                  if (nextMsg.content && !nextHasToolCalls) {
                    console.log(`  🔄 Using next message (${idx + 1}) as tool response (type: ${nextMsgType})`);
                    intermediateSteps.push({
                      action: {
                        tool: toolName,
                        tool_input: toolArgs,
                      },
                      observation: nextMsg.content || '',
                    });
                  }
                }
              }
            }
          }
          
          // Also check if this is a tool message that wasn't already matched
          const msgType2 = msg.role || msg._getType?.() || msg.constructor?.name || 'unknown';
          const isToolMsg2 = msgType2 === 'tool' || msgType2.includes('Tool') || msgType2 === 'ToolMessage';
          
          if (isToolMsg2 && msg.content) {
            const toolCallId = msg.tool_call_id || msg.toolCallId;
            const toolName = msg.name || 'unknown';
            
            // Check if this tool response was already extracted
            const alreadyExtracted = intermediateSteps.some(step => {
              return step.action?.tool === toolName && step.observation === (msg.content || msg.text);
            });
            
            if (!alreadyExtracted) {
              const toolContent = msg.content || msg.text || '';
              
              // Try to find the preceding assistant message that might have called this tool
              for (let j = idx - 1; j >= 0; j--) {
                const prevMsg = result.messages[j];
                const prevMsgType = prevMsg.role || prevMsg._getType?.() || prevMsg.constructor?.name || 'unknown';
                const isPrevAssistant = prevMsgType === 'assistant' || prevMsgType.includes('Assistant') || prevMsgType === 'AIMessage';
                
                if (isPrevAssistant) {
                  // Extract tool call details from the assistant message if available
                  const toolCalls = prevMsg.tool_calls || prevMsg.toolCalls || [];
                  let toolArgs = {};
                  
                  // Try to find matching tool call in the assistant message
                  const matchingToolCall = toolCalls.find(tc => 
                    (tc.id || tc.tool_call_id) === toolCallId || 
                    (tc.name || tc.function?.name) === toolName
                  );
                  
                  if (matchingToolCall) {
                    toolArgs = matchingToolCall.args || 
                      (matchingToolCall.function?.arguments 
                        ? (typeof matchingToolCall.function.arguments === 'string' 
                            ? JSON.parse(matchingToolCall.function.arguments)
                            : matchingToolCall.function.arguments)
                        : {});
                  }
                  
                  // Add this tool response to intermediate steps
                  intermediateSteps.push({
                    action: {
                      tool: toolName,
                      tool_input: toolArgs,
                    },
                    observation: toolContent,
                  });
                  console.log(`✅ Extracted tool response from standalone tool message: ${toolName}`);
                  break;
                }
              }
            }
          }
        }
        
        console.log(`📊 Extracted ${intermediateSteps.length} intermediate step(s) from ${result.messages.length} message(s)`);

        // Log execution
        await logAgentExecution({
          userId,
          agentType,
          input: typeof input === 'string' ? input : JSON.stringify(input),
          output: output,
          toolCalls: intermediateSteps,
          tokensUsed: 0, // TODO: extract from result if available
          durationMs: Date.now() - startTime,
          status: 'success',
        });

  return {
          output: output,
          intermediateSteps: intermediateSteps,
        };
      } catch (error) {
        const durationMs = Date.now() - startTime;

        await logAgentExecution({
          userId,
          agentType,
          input: typeof input === 'string' ? input : JSON.stringify(input),
          output: null,
          toolCalls: intermediateSteps,
          tokensUsed: 0,
          durationMs,
          status: 'error',
          error: error.message,
        });

        throw error;
      }
    },
  };

  return agentWithLogging;
}

module.exports = {
  buildAgent,
};
