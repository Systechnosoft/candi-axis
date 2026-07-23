import { Test, TestingModule } from '@nestjs/testing';
import { PdfLinkAnnotatorService } from './pdf-link-annotator.service';

describe('PdfLinkAnnotatorService', () => {
  let service: PdfLinkAnnotatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfLinkAnnotatorService],
    }).compile();

    service = module.get<PdfLinkAnnotatorService>(PdfLinkAnnotatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('URL Normalization and Deduplication', () => {
    it('should normalize URLs by prepending https and removing trailing punctuation', () => {
      const rawLinks = [
        { url: 'www.linkedin.com/in/test' },
        { url: 'https://github.com/user.,' },
        { url: 'http://example.com' },
      ];

      const result = service.normalizeAndDedupeLinks(rawLinks);

      expect(result).toEqual([
        expect.objectContaining({ url: 'https://www.linkedin.com/in/test', type: 'linkedin' }),
        expect.objectContaining({ url: 'https://github.com/user', type: 'github' }),
        expect.objectContaining({ url: 'http://example.com', type: 'other' }),
      ]);
    });

    it('should deduplicate links with same normalized URL', () => {
      const rawLinks = [
        { url: 'https://github.com/user' },
        { url: 'github.com/user' }, // Will be normalized to https://github.com/user
        { url: 'https://github.com/user' },
      ];

      const result = service.normalizeAndDedupeLinks(rawLinks);

      expect(result.length).toBe(1);
      expect(result[0].url).toBe('https://github.com/user');
      expect(result[0].type).toBe('github');
    });
  });

  describe('Type Detection', () => {
    it('should detect linkedin correctly', () => {
      expect(service.inferLinkType('https://linkedin.com/in/foo')).toBe('linkedin');
      expect(service.inferLinkType('https://somethingelse.com', 'My LinkedIn')).toBe('linkedin');
    });

    it('should detect github correctly', () => {
      expect(service.inferLinkType('https://github.com/foo')).toBe('github');
      expect(service.inferLinkType('https://myrepo.net', 'Github profile')).toBe('github');
    });

    it('should detect portfolio correctly', () => {
      expect(service.inferLinkType('https://myportfolio.com')).toBe('portfolio');
      expect(service.inferLinkType('https://behance.net/foo')).toBe('portfolio');
      expect(service.inferLinkType('https://custom.com', 'Portfolio')).toBe('portfolio');
    });

    it('should detect website correctly', () => {
      expect(service.inferLinkType('https://johndoe.dev')).toBe('website');
      expect(service.inferLinkType('https://johndoe.me')).toBe('website');
      expect(service.inferLinkType('https://custom.com', 'Personal Website')).toBe('website');
      expect(service.inferLinkType('https://custom.com', 'My Blog')).toBe('website');
    });

    it('should default to other', () => {
      expect(service.inferLinkType('https://random.com')).toBe('other');
    });
  });
});
