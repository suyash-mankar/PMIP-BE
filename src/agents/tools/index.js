/**
 * Tool Registry
 * Exports all available tools for agents
 */

const { knowledgeRetriever } = require('./knowledgeRetriever');
const { exemplarFetch } = require('./exemplarFetch');
const { scoreAnswer } = require('./scoreAnswer');
const { scoreAnswerSummarised } = require('./scoreAnswerSummarised');
const { userMemory } = require('./userMemory');

module.exports = {
  knowledgeRetriever,
  exemplarFetch,
  scoreAnswer,
  scoreAnswerSummarised,
  userMemory,
};
