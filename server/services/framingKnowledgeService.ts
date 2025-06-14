
import axios from 'axios';
import * as cheerio from 'cheerio';
import { storage } from '../storage';

export class FramingKnowledgeService {
  private baseUrl = 'https://www.thegrumble.com';
  private knowledgeCache: Map<string, any> = new Map();
  private lastScrapeTime = 0;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  async searchFramingKnowledge(query: string): Promise<string> {
    try {
      // Check if we have recent knowledge cached
      if (this.shouldRefreshKnowledge()) {
        await this.scrapeRecentTopics();
      }

      // Search cached knowledge
      const relevantTopics = this.searchCachedKnowledge(query);
      
      if (relevantTopics.length > 0) {
        return this.formatKnowledgeResponse(relevantTopics, query);
      }

      return `No specific framing knowledge found for "${query}". Consider checking The Grumble forum directly for specialized framing techniques and expert advice.`;
    } catch (error) {
      console.error('Error searching framing knowledge:', error);
      return 'Unable to access framing knowledge database at this time.';
    }
  }

  private async scrapeRecentTopics(): Promise<void> {
    try {
      // Note: This is a basic example - real implementation would need
      // to respect robots.txt and rate limiting
      const response = await axios.get(`${this.baseUrl}/forums/`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Jay\'s Frames Knowledge Bot 1.0'
        }
      });

      const $ = cheerio.load(response.data);
      const topics = [];

      // Extract forum topics (adjust selectors based on actual site structure)
      $('.topic-title, .thread-title, .post-title').each((index, element) => {
        if (index < 20) { // Limit to recent topics
          const title = $(element).text().trim();
          const link = $(element).attr('href');
          const content = $(element).closest('.topic, .thread').find('.content, .excerpt').text().trim();
          
          if (title && title.length > 10) {
            topics.push({
              title,
              link: link?.startsWith('http') ? link : `${this.baseUrl}${link}`,
              content: content.substring(0, 500),
              scrapedAt: new Date(),
              keywords: this.extractKeywords(title + ' ' + content)
            });
          }
        }
      });

      // Cache the topics
      topics.forEach(topic => {
        this.knowledgeCache.set(topic.title, topic);
      });

      this.lastScrapeTime = Date.now();
      console.log(`Scraped ${topics.length} framing topics from The Grumble`);
    } catch (error) {
      console.error('Error scraping The Grumble:', error);
    }
  }

  private extractKeywords(text: string): string[] {
    const framingTerms = [
      'moulding', 'matting', 'glazing', 'mounting', 'rabbet', 'fillet',
      'conservation', 'archival', 'acid-free', 'museum', 'preservation',
      'float mount', 'dry mount', 'wet mount', 'backing', 'spacer',
      'uv protection', 'anti-reflective', 'non-glare', 'plexi', 'acrylic',
      'glass', 'mitering', 'joining', 'corner', 'profile', 'depth',
      'shadowbox', 'canvas', 'stretcher', 'liner', 'slip', 'reveal',
      'bevel', 'cutting', 'fitting', 'hanging', 'wire', 'sawtooth',
      'd-ring', 'bumper', 'offset', 'standoff', 'easel', 'fitting'
    ];

    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    return words.filter(word => 
      word.length > 3 && (
        framingTerms.includes(word) || 
        words.some(term => framingTerms.includes(term))
      )
    );
  }

  private searchCachedKnowledge(query: string): any[] {
    const queryTerms = query.toLowerCase().split(' ');
    const results = [];

    for (const [title, topic] of this.knowledgeCache.entries()) {
      const relevanceScore = this.calculateRelevance(topic, queryTerms);
      if (relevanceScore > 0.3) {
        results.push({ ...topic, relevanceScore });
      }
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);
  }

  private calculateRelevance(topic: any, queryTerms: string[]): number {
    const text = (topic.title + ' ' + topic.content).toLowerCase();
    let score = 0;

    queryTerms.forEach(term => {
      if (text.includes(term)) {
        score += 0.2;
      }
      
      // Boost score for framing-specific terms
      if (topic.keywords?.includes(term)) {
        score += 0.3;
      }
    });

    return Math.min(score, 1.0);
  }

  private formatKnowledgeResponse(topics: any[], query: string): string {
    const topTopic = topics[0];
    
    let response = `**Framing Knowledge:** Found relevant discussion about "${query}"\n\n`;
    response += `**${topTopic.title}**\n`;
    response += `${topTopic.content.substring(0, 200)}...\n\n`;
    response += `[View full discussion](${topTopic.link})\n\n`;

    if (topics.length > 1) {
      response += `**Related topics:**\n`;
      topics.slice(1, 3).forEach(topic => {
        response += `• ${topic.title}\n`;
      });
    }

    response += `\n*Source: The Grumble Professional Framing Forum*`;
    return response;
  }

  private shouldRefreshKnowledge(): boolean {
    return Date.now() - this.lastScrapeTime > this.CACHE_TTL;
  }

  async getFramingTechnique(technique: string): Promise<string> {
    return this.searchFramingKnowledge(`${technique} technique framing method`);
  }

  async getTroubleshootingHelp(issue: string): Promise<string> {
    return this.searchFramingKnowledge(`${issue} problem solution framing`);
  }

  async getMaterialAdvice(material: string): Promise<string> {
    return this.searchFramingKnowledge(`${material} material recommendation framing`);
  }
}

export const framingKnowledgeService = new FramingKnowledgeService();
