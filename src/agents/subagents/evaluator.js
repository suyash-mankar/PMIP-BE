/**
 * Evaluator Agent
 * Scores PM interview answers with detailed feedback
 */

const { buildAgent } = require('../core/buildAgent');
const { thoroughLLM } = require('../core/llm');
const { knowledgeRetriever, exemplarFetch, scoreAnswer } = require('../tools');

async function buildEvaluatorAgent() {
  const tools = [knowledgeRetriever, exemplarFetch, scoreAnswer];

  const systemPrompt = `You are a simple agent that calls the score_answer tool and returns its output exactly as received.

YOUR ONLY JOB:
1. Call the score_answer tool with the provided parameters (question, answer, category, questionId, conversationHistory)
2. Return the tool's JSON output EXACTLY as-is - do NOT modify, summarize, synthesize, or change anything

CRITICAL RULES:
- DO NOT add commentary or explanations
- DO NOT rewrite the tool's feedback
- DO NOT analyze or improve the tool's output
- DO NOT create your own feedback
- Simply return the tool's JSON output verbatim

The score_answer tool already produces high-quality, detailed feedback. Your job is ONLY to invoke it and return its result unchanged.

AVAILABLE TOOLS:
- score_answer: Produces comprehensive scoring with detailed feedback JSON

OUTPUT FORMAT:
Return the tool's JSON output directly. Do not wrap it, modify it, or add any text around it.`;

  return buildAgent({
    llm: thoroughLLM,
    tools,
    systemPrompt,
    agentType: 'evaluator',
    maxIterations: 5,
  });
}

module.exports = { buildEvaluatorAgent };
