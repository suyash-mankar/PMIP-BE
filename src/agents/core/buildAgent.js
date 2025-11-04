/**
 * Agent Builder
 * Creates LangChain agents with tools and prompts
 */

const { AgentExecutor } = require('langchain/agents');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { RunnableSequence } = require('@langchain/core/runnables');
const { logAgentExecution } = require('../../utils/vector');

/**
 * Build a LangChain agent with tools
 * @param {Object} config
 * @param {ChatOpenAI} config.llm - LLM instance
 * @param {Array} config.tools - Array of tool definitions
 * @param {string} config.systemPrompt - System prompt text
 * @param {string} config.agentType - Agent type for logging
 * @param {number} config.maxIterations - Max tool call iterations
 * @returns {AgentExecutor}
 */
async function buildAgent({
  llm,
  tools,
  systemPrompt,
  agentType = 'unknown',
  maxIterations = 6,
}) {
  // Create prompt template
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', systemPrompt],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]);

  // Build agent
  const agent = RunnableSequence.from([
    {
      input: input => input.input,
      agent_scratchpad: input => input.agent_scratchpad || [],
    },
    prompt,
    llm.bind({ tools: tools.map(convertToolToOpenAIFormat) }),
    parseAgentOutput,
  ]);

  // Wrap in executor with logging
  const executor = new AgentExecutor({
    agent,
    tools: tools.map(t => ({
      name: t.name,
      description: t.description,
      func: t.func,
    })),
    maxIterations,
    returnIntermediateSteps: true,
  });

  // Add logging wrapper
  const executorWithLogging = {
    async invoke(input, options = {}) {
      const startTime = Date.now();
      const userId = options.userId || null;
      
      try {
        const result = await executor.invoke(input);
        const durationMs = Date.now() - startTime;
        
        // Log execution
        await logAgentExecution({
          userId,
          agentType,
          input,
          output: result.output,
          toolCalls: result.intermediateSteps || [],
          tokensUsed: 0, // TODO: track from LLM calls
          durationMs,
          status: 'success',
        });

        return result;
      } catch (error) {
        const durationMs = Date.now() - startTime;
        
        await logAgentExecution({
          userId,
          agentType,
          input,
          output: null,
          toolCalls: [],
          tokensUsed: 0,
          durationMs,
          status: 'error',
          error: error.message,
        });

        throw error;
      }
    },
  };

  return executorWithLogging;
}

/**
 * Convert tool definition to OpenAI function calling format
 */
function convertToolToOpenAIFormat(tool) {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.schema || {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  };
}

/**
 * Parse agent output (extract tool calls or final response)
 */
function parseAgentOutput(llmOutput) {
  const message = llmOutput.messages[llmOutput.messages.length - 1];
  
  if (message.tool_calls && message.tool_calls.length > 0) {
    // Return tool calls
    return {
      toolCalls: message.tool_calls,
      output: null,
    };
  }

  // Final output
  return {
    toolCalls: [],
    output: message.content,
  };
}

module.exports = {
  buildAgent,
};
