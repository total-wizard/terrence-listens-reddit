class SlackService {
  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!this.webhookUrl) {
      throw new Error('Missing SLACK_WEBHOOK_URL environment variable');
    }
  }

  async sendMatch(post, evaluation) {
    const subreddit = post.feedTitle || 'Unknown';
    const title = post.title || 'No title';
    const link = post.link || '';
    const snippet = (post.contentSnippet || post.content || '').substring(0, 300);

    const message = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `r/${subreddit}`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*<${link}|${title}>*`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `> ${snippet.replace(/\n/g, '\n> ')}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Suggested angle:* ${evaluation.suggested_angle}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Why:* ${evaluation.reason}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Reply on Reddit'
              },
              url: link
            }
          ]
        },
        {
          type: 'divider'
        }
      ]
    };

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        const body = await response.text();
        console.error(`Slack webhook error (${response.status}): ${body}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error sending Slack message:', error.message);
      return false;
    }
  }
}

export default SlackService;
