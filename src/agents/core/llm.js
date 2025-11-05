/**
 * LangChain LLM Configuration
 * Shared LLM clients for agents
 */

const { ChatOpenAI } = require('@langchain/openai');

// Fast LLM for quick interactions (clarifications, routing, etc.)
const fastLLM = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.2,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Thorough LLM for detailed analysis (scoring, feedback generation)
const thoroughLLM = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0.2,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Creative LLM for generation tasks
const creativeLLM = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

module.exports = {
  fastLLM,
  thoroughLLM,
  creativeLLM,
};
