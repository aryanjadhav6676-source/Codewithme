const OpenAI = require('openai');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.AI_API_KEY,
    });
    this.model = process.env.AI_MODEL || 'gpt-4o-mini';
    this.maxTokens = parseInt(process.env.AI_MAX_TOKENS) || 2000;
    this.temperature = parseFloat(process.env.AI_TEMPERATURE) || 0.7;
  }

  async askAI(roomId, prompt, context = {}) {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        stream: false
      });

      return {
        message: response.choices[0].message.content,
        success: true
      };
    } catch (error) {
      console.error('AI Service Error:', error);
      return {
        message: `Sorry, I encountered an error: ${error.message}`,
        success: false
      };
    }
  }

  buildSystemPrompt(context) {
    const { files = [], language = 'javascript', recentChat = [] } = context;
    
    let prompt = `You are "AI", a friendly and helpful teammate in a collaborative coding room. You can help with:

1. **Code Review & Improvement**: Suggest better approaches, identify bugs, optimize performance
2. **Problem Solving**: Help break down complex problems, suggest algorithms, explain concepts
3. **Code Generation**: Write functions, tests, or complete solutions when asked
4. **Learning & Teaching**: Explain code, concepts, and best practices
5. **Project Guidance**: Suggest project structure, dependencies, and next steps

**Current Context:**
- Programming Language: ${language}
- Files in project: ${files.map(f => f.name).join(', ')}
- Active file: ${files.find(f => f.name === context.activeFile)?.name || 'Unknown'}

**Guidelines:**
- Be concise but helpful
- When suggesting code changes, explain the reasoning
- If you see potential issues, point them out proactively
- Use the current language's best practices and idioms
- Be encouraging and supportive - you're here to help the team succeed!

**Remember**: You're part of the team, not just a tool. Engage naturally and help create a positive coding environment.`;

    if (recentChat.length > 0) {
      prompt += `\n\n**Recent conversation context:**\n${recentChat.slice(-3).map(msg => `${msg.user}: ${msg.msg}`).join('\n')}`;
    }

    return prompt;
  }

  async generateCodeSuggestion(prompt, language, context) {
    try {
      const systemPrompt = `You are an expert ${language} developer. Generate code based on the user's request. 
      Return only the code with brief comments explaining key parts. Make sure the code is production-ready and follows ${language} best practices.`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: this.maxTokens,
        temperature: 0.3
      });

      return {
        code: response.choices[0].message.content,
        success: true
      };
    } catch (error) {
      return {
        code: `Error generating code: ${error.message}`,
        success: false
      };
    }
  }

  async explainCode(code, language) {
    try {
      const systemPrompt = `You are a programming tutor. Explain the given ${language} code in a clear, beginner-friendly way. 
      Break down complex parts and explain the logic step by step.`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please explain this ${language} code:\n\n${code}` }
        ],
        max_tokens: this.maxTokens,
        temperature: 0.5
      });

      return {
        explanation: response.choices[0].message.content,
        success: true
      };
    } catch (error) {
      return {
        explanation: `Error explaining code: ${error.message}`,
        success: false
      };
    }
  }

  async suggestImprovements(code, language) {
    try {
      const systemPrompt = `You are a senior ${language} developer doing a code review. Analyze the code and suggest specific improvements for:
      1. Performance optimization
      2. Code readability and maintainability
      3. Security considerations
      4. Best practices
      
      Be specific and provide actionable suggestions.`;

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please review this ${language} code and suggest improvements:\n\n${code}` }
        ],
        max_tokens: this.maxTokens,
        temperature: 0.4
      });

      return {
        suggestions: response.choices[0].message.content,
        success: true
      };
    } catch (error) {
      return {
        suggestions: `Error analyzing code: ${error.message}`,
        success: false
      };
    }
  }
}

module.exports = AIService;
