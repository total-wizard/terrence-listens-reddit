import OpenAI from 'openai';

class LLMFilter {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
    
    this.systemPrompt = `We are scanning Reddit feeds for business ideas that are solvable via vibe coding and technology. You are an analyst in our firm helping us sift through these ideas. We believe the submitted post represents a problem that people would pay to be solved. Your job is to evaluate if the problem can be solved with a specific technology stack or not. Ask yourself, is this a problem that could be solved with a bespoke web application or mobile application?

We are vibe coders, looking to build simple to moderately complex web apps. We want to leverage as much 3rd party/off the shelf code as possible (Stripe, etc.) - we are not interested in opportunities to do with hardware, or firmware.

Respond with a JSON object containing:
- "viable": boolean (true if this represents a viable web/mobile app opportunity)
- "reason": string (brief explanation of your decision)
- "tech_stack_ideas": array of strings (suggested technologies if viable, empty array if not)
- "complexity": string ("simple", "moderate", "complex", or "too_complex")`;
  }

  async evaluatePost(post) {
    try {
      const userPrompt = `Please evaluate this Reddit post:

Title: ${post.title}
Subreddit: ${post.feedTitle || 'Unknown'}
Content: ${post.contentSnippet || post.content || 'No content available'}
Link: ${post.link}

Is this a viable business opportunity that could be solved with a web/mobile application?`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const content = response.choices[0].message.content;
      
      try {
        const evaluation = JSON.parse(content);
        return {
          viable: evaluation.viable || false,
          reason: evaluation.reason || 'No reason provided',
          tech_stack_ideas: evaluation.tech_stack_ideas || [],
          complexity: evaluation.complexity || 'unknown',
          raw_response: content
        };
      } catch (parseError) {
        console.error('Failed to parse LLM response as JSON:', content);
        return {
          viable: false,
          reason: 'Failed to parse LLM response',
          tech_stack_ideas: [],
          complexity: 'unknown',
          raw_response: content
        };
      }

    } catch (error) {
      console.error('Error evaluating post with LLM:', error.message);
      return {
        viable: false,
        reason: `Error: ${error.message}`,
        tech_stack_ideas: [],
        complexity: 'unknown',
        raw_response: null
      };
    }
  }

  async filterPosts(posts) {
    const results = [];
    
    for (const post of posts) {
      console.log(`Evaluating post: "${post.title.substring(0, 50)}..."`);
      
      const evaluation = await this.evaluatePost(post);
      
      if (evaluation.viable) {
        console.log(`✅ Post approved: ${evaluation.reason}`);
        results.push({
          ...post,
          llm_evaluation: evaluation
        });
      } else {
        console.log(`❌ Post rejected: ${evaluation.reason}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }
}

export default LLMFilter;