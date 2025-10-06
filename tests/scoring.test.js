const { parseAndValidateScore } = require('../src/services/openaiService');

describe('Scoring Service', () => {
  describe('parseAndValidateScore', () => {
    it('should parse valid JSON response correctly', () => {
      const validResponse = JSON.stringify({
        structure: 8,
        metrics: 7,
        prioritization: 9,
        user_empathy: 8,
        communication: 7,
        feedback:
          '• Strong framework usage\n• Good metric selection\n• Could improve on edge cases',
        sample_answer: 'I would approach this using the CIRCLES method...',
      });

      const result = parseAndValidateScore(validResponse);

      expect(result.structure).toBe(8);
      expect(result.metrics).toBe(7);
      expect(result.prioritization).toBe(9);
      expect(result.user_empathy).toBe(8);
      expect(result.communication).toBe(7);
      expect(result.feedback).toContain('Strong framework');
      expect(result.sample_answer).toContain('CIRCLES');
    });

    it('should strip markdown code blocks from response', () => {
      const responseWithMarkdown = `\`\`\`json
{
  "structure": 8,
  "metrics": 7,
  "prioritization": 9,
  "user_empathy": 8,
  "communication": 7,
  "feedback": "Good answer",
  "sample_answer": "Sample response"
}
\`\`\``;

      const result = parseAndValidateScore(responseWithMarkdown);

      expect(result.structure).toBe(8);
      expect(result.metrics).toBe(7);
    });

    it('should throw error for missing required fields', () => {
      const invalidResponse = JSON.stringify({
        structure: 8,
        metrics: 7,
        // Missing other fields
      });

      expect(() => parseAndValidateScore(invalidResponse)).toThrow('Missing required field');
    });

    it('should throw error for invalid numeric ranges', () => {
      const invalidResponse = JSON.stringify({
        structure: 15, // Invalid: > 10
        metrics: 7,
        prioritization: 9,
        user_empathy: 8,
        communication: 7,
        feedback: 'Good answer',
        sample_answer: 'Sample response',
      });

      expect(() => parseAndValidateScore(invalidResponse)).toThrow('Invalid structure');
    });

    it('should throw error for negative scores', () => {
      const invalidResponse = JSON.stringify({
        structure: -1, // Invalid: < 0
        metrics: 7,
        prioritization: 9,
        user_empathy: 8,
        communication: 7,
        feedback: 'Good answer',
        sample_answer: 'Sample response',
      });

      expect(() => parseAndValidateScore(invalidResponse)).toThrow('Invalid structure');
    });

    it('should throw error for non-numeric scores', () => {
      const invalidResponse = JSON.stringify({
        structure: '8', // Should be number, not string
        metrics: 7,
        prioritization: 9,
        user_empathy: 8,
        communication: 7,
        feedback: 'Good answer',
        sample_answer: 'Sample response',
      });

      expect(() => parseAndValidateScore(invalidResponse)).toThrow('Invalid structure');
    });

    it('should throw error for invalid feedback', () => {
      const invalidResponse = JSON.stringify({
        structure: 8,
        metrics: 7,
        prioritization: 9,
        user_empathy: 8,
        communication: 7,
        feedback: 'short', // Too short
        sample_answer: 'Sample response',
      });

      expect(() => parseAndValidateScore(invalidResponse)).toThrow('Invalid feedback');
    });

    it('should throw error for malformed JSON', () => {
      const malformedResponse = '{ structure: 8, metrics: 7 }'; // Invalid JSON (unquoted keys)

      expect(() => parseAndValidateScore(malformedResponse)).toThrow('Failed to parse JSON');
    });

    it('should handle edge case scores (0 and 10)', () => {
      const validResponse = JSON.stringify({
        structure: 0,
        metrics: 10,
        prioritization: 0,
        user_empathy: 10,
        communication: 5,
        feedback: 'Edge case testing with minimum and maximum scores',
        sample_answer: 'Sample response for edge case',
      });

      const result = parseAndValidateScore(validResponse);

      expect(result.structure).toBe(0);
      expect(result.metrics).toBe(10);
      expect(result.prioritization).toBe(0);
      expect(result.user_empathy).toBe(10);
    });
  });
});
