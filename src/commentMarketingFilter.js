import OpenAI from 'openai';

class CommentMarketingFilter {
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }

    this.openai = new OpenAI({ apiKey });

    this.systemPrompt = `You are a comment marketing analyst for Path — an AI productivity app that breaks overwhelming tasks into manageable steps. Path helps people who struggle with task paralysis, executive dysfunction, and feeling overwhelmed by turning big scary tasks into small doable actions.

Your job is to evaluate Reddit posts and determine if the poster is experiencing problems that Path could help with. Look for signals like:

- Task paralysis or inability to start tasks
- Feeling overwhelmed by responsibilities or to-do lists
- ADHD/executive dysfunction struggles with planning or prioritizing
- Depression-related inaction or difficulty getting things done
- Procrastination driven by anxiety or perfectionism
- Wanting to be productive but not knowing where to begin
- Struggling to break big goals into actionable steps

Do NOT flag posts that are:
- General memes or jokes without a real underlying struggle
- Medication discussions or clinical advice threads
- Relationship or social issues unrelated to productivity
- Posts where the person has already found their solution

Respond with a JSON object containing:
- "relevant": boolean (true if this person could genuinely benefit from Path)
- "reason": string (brief explanation of why this post matches or doesn't)
- "suggested_angle": string (if relevant: a brief note on how to frame Path as helpful for this person's specific complaint — conversational, empathetic, not salesy. If not relevant, empty string.)`;
  }

  async evaluatePost(post) {
    try {
      const userPrompt = `Evaluate this Reddit post for comment marketing relevance:

Title: ${post.title}
Subreddit: ${post.feedTitle || 'Unknown'}
Content: ${post.contentSnippet || post.content || 'No content available'}
Link: ${post.link}

Is this person experiencing a problem that Path (AI task breakdown app) could help with?`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 400
      });

      const content = response.choices[0].message.content;

      try {
        const evaluation = JSON.parse(content);
        return {
          relevant: evaluation.relevant || false,
          reason: evaluation.reason || 'No reason provided',
          suggested_angle: evaluation.suggested_angle || '',
          raw_response: content
        };
      } catch (parseError) {
        console.error('[CommentMarketing] Failed to parse LLM response:', content);
        return {
          relevant: false,
          reason: 'Failed to parse LLM response',
          suggested_angle: '',
          raw_response: content
        };
      }
    } catch (error) {
      console.error('[CommentMarketing] Error evaluating post:', error.message);
      return {
        relevant: false,
        reason: `Error: ${error.message}`,
        suggested_angle: '',
        raw_response: null
      };
    }
  }

  async filterPosts(posts) {
    const results = [];

    for (const post of posts) {
      console.log(`[CommentMarketing] Evaluating: "${post.title.substring(0, 50)}..."`);

      const evaluation = await this.evaluatePost(post);

      if (evaluation.relevant) {
        console.log(`[CommentMarketing] ✅ Match: ${evaluation.reason}`);
        results.push({ post, evaluation });
      } else {
        console.log(`[CommentMarketing] ❌ Skip: ${evaluation.reason}`);
      }

      // Rate limit: 1 second between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }
}

export default CommentMarketingFilter;
