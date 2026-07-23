import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

export type LinkType = 'linkedin' | 'github' | 'portfolio' | 'website' | 'other';

export interface ExtractedLink {
  type: LinkType;
  url: string;
  label?: string;
  source: 'pdf_annotation' | 'gemini';
}

@Injectable()
export class PdfLinkAnnotatorService {
  private readonly logger = new Logger(PdfLinkAnnotatorService.name);

  /**
   * Extracts hyperlink annotations from a PDF buffer.
   * Runs alongside or before normal parsing to collect raw URLs behind text.
   */
  async extractLinks(pdfBuffer: Buffer): Promise<ExtractedLink[]> {
    const rawLinks: Array<{ url: string; label?: string }> = [];

    try {
      const options = {
        pagerender: async function (pageData: any) {
          try {
            // Extract annotations from the page
            const annotations = await pageData.getAnnotations();
            
            // Look for link annotations
            for (const annotation of annotations) {
              let url = annotation.url || annotation.unsafeUrl;
              
              if (!url && annotation.uri) {
                url = annotation.uri;
              }
              
              if (!url && annotation.dest && typeof annotation.dest === 'string') {
                if (annotation.dest.toLowerCase().startsWith('http') || annotation.dest.toLowerCase().startsWith('www.')) {
                  url = annotation.dest;
                }
              }

              if (!url) {
                for (const key of Object.keys(annotation)) {
                  const val = annotation[key];
                  if (typeof val === 'string' && (val.toLowerCase().startsWith('http://') || val.toLowerCase().startsWith('https://'))) {
                    url = val;
                    break;
                  }
                }
              }

              if (url && typeof url === 'string') {
                rawLinks.push({
                  url: url,
                  label: annotation.title || annotation.flatName || undefined,
                });
              }
            }
          } catch (e) {
             // Ignoring single page annotation errors
          }

          // Return standard text content extraction to not break pdf-parse
          const render_options = {
            normalizeWhitespace: false,
            disableCombineTextItems: false,
          };

          return pageData.getTextContent(render_options).then(function (textContent: any) {
            let lastY, text = '';
            for (const item of textContent.items) {
              if (lastY == item.transform[5] || !lastY) {
                text += item.str;
              } else {
                text += '\n' + item.str;
              }
              lastY = item.transform[5];
            }
            return text;
          });
        },
      };

      await pdfParse(pdfBuffer, options);
      
      return this.normalizeAndDedupeLinks(rawLinks);
    } catch (error) {
      this.logger.warn(`Failed to extract PDF annotations: ${error instanceof Error ? error.message : String(error)}`);
      return []; // Return empty array on failure instead of failing the job
    }
  }

  public normalizeAndDedupeLinks(rawLinks: Array<{ url: string; label?: string }>): ExtractedLink[] {
    const uniqueMap = new Map<string, ExtractedLink>();

    for (const raw of rawLinks) {
      let url = raw.url.trim();

      // Basic cleanup
      url = url.replace(/['"]+$/g, ''); // Remove trailing quotes
      url = url.replace(/[.,;:]+$/g, ''); // Remove trailing punctuation

      if (!url) continue;

      if (url.toLowerCase().startsWith('www.')) {
        url = 'https://' + url;
      } else if (!url.toLowerCase().startsWith('http://') && !url.toLowerCase().startsWith('https://')) {
        // Assume https for bare domains if they look like a valid domain, though PDF annotations typically include proto.
        url = 'https://' + url;
      }

      const type = this.inferLinkType(url, raw.label);

      // Deduplicate by normalized URL
      const key = url.toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          type,
          url,
          label: raw.label,
          source: 'pdf_annotation',
        });
      }
    }

    return Array.from(uniqueMap.values());
  }

  public inferLinkType(url: string, label?: string): LinkType {
    const lowerUrl = url.toLowerCase();
    const lowerLabel = (label || '').toLowerCase();

    if (lowerUrl.includes('linkedin.com') || lowerLabel.includes('linkedin')) {
      return 'linkedin';
    }
    if (lowerUrl.includes('github.com') || lowerLabel.includes('github')) {
      return 'github';
    }
    
    // Check for common portfolio terms
    if (
      lowerUrl.includes('portfolio') || 
      lowerLabel.includes('portfolio') || 
      lowerUrl.includes('behance.net') || 
      lowerUrl.includes('dribbble.com')
    ) {
      return 'portfolio';
    }

    // Heuristics for personal websites vs "other"
    if (
      lowerLabel.includes('website') || 
      lowerLabel.includes('blog') ||
      lowerUrl.endsWith('.dev') || 
      lowerUrl.endsWith('.me')
    ) {
      return 'website';
    }

    return 'other';
  }
}
