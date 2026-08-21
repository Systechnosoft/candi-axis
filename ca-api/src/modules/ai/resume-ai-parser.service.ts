import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AdminSettingsService } from '../admin/admin-settings.service';
import { AiExecutionService } from './ai-execution.service';
import OpenAI from 'openai';

export interface ParsedResume {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  summary: string;
  skills: string[];
  education: any[];
  employment: any[];
  certifications: any[];
  projects?: any[];
  total_experience_months: number;
  current_ctc?: number;
  expected_ctc?: number;
  notice_period_days?: number;
}

const RESUME_PARSE_PROMPT = `
You are an expert ATS (Applicant Tracking System) resume parser.
Your task is to comprehensively extract structured fields from the provided resume text. Do not summarize or skip any employment history, education, or skills.
You must return ONLY a valid structured data format adhering exactly to the following strict schema.

{
  "full_name": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "linkedin_url": "string",
  "github_url": "string",
  "portfolio_url": "string",
  "summary": "string",
  "skills": ["string"],
  "education": [{"degree": "string", "field_of_study": "string", "institution": "string", "start_year": "string", "end_year": "string"}],
  "employment": [{"title": "string", "company": "string", "start_date": "string", "end_date": "string", "description": "string"}],
  "certifications": [{"name": "string", "issuer": "string", "issued_on": "string", "expiry_on": "string"}],
  "projects": [{"title": "string", "description": "string", "technologies": ["string"], "duration": "string", "role": "string", "project_url": "string"}],
  "total_experience_months": 0,
  "current_ctc": 0,
  "expected_ctc": 0,
  "notice_period_days": 0
}

CRITICAL RULES:
1. If a field is missing from the resume, use an empty string "", empty array [], or 0.
2. For descriptions and summaries, preserve all bullet points exactly as they appear in the resume.
3. EXTRACT ALL EMPLOYMENT AND EDUCATION ENTRIES. DO NOT SKIP ANY.
4. Extract ALL skills mentioned in the resume into the skills array.
5. You must output a pure parsable data object without any conversational text.
`.trim();

@Injectable()
export class ResumeAiParserService {
  private readonly logger = new Logger(ResumeAiParserService.name);

  constructor(
    private readonly adminService: AdminSettingsService,
    private readonly aiExecutionService: AiExecutionService,
  ) {}

  async parseResumeText(text: string, email: string): Promise<ParsedResume> {
    const config = await this.adminService.getAiConfigForOrg(email);
    const provider = (config.provider || 'gemini').toLowerCase();
    const model = config.model;
    const baseUrl = config.base_url;

    this.logger.log(
      `Resume parsing request - Org email domain: ${email.split('@')[1]}, provider: ${provider}, model: ${model}`,
    );

    if (provider !== 'gemini' && !baseUrl) {
      throw new Error(`Provider "${provider}" requires a base URL. Please configure it in Site Configuration.`);
    }

    return this.aiExecutionService.executeWithFailover(email, provider, async (apiKey) => {
      if (provider === 'gemini') {
        return this.callGemini(text, apiKey, model!);
      } else {
        return this.callOpenAiCompat(text, apiKey, baseUrl!, model!);
      }
    });
  }

  private async callGemini(
    text: string,
    apiKey: string,
    model: string,
  ): Promise<ParsedResume> {
    this.logger.log(`Calling Gemini API for resume parsing - model: ${model}`);
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = genAI.getGenerativeModel({
        model,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const result = await geminiModel.generateContent(
        `${RESUME_PARSE_PROMPT}\n\nResume Text:\n${text}`,
      );
      const raw = result.response.text();
      if (!raw) throw new Error('Gemini returned empty content.');
      return this.parseJson(raw);
    } catch (error) {
      this.logger.error(`Gemini API request failed: ${error.message}`);
      throw error;
    }
  }

  private async callOpenAiCompat(
    text: string,
    apiKey: string,
    baseUrl: string,
    model: string,
  ): Promise<ParsedResume> {
    this.logger.log(
      `Calling OpenAI-compatible API for resume parsing - baseUrl: ${baseUrl}, model: ${model}`,
    );
    try {
      const client = new OpenAI({ apiKey, baseURL: baseUrl });
      const reqPayload: any = {
        model,
        messages: [
          { role: 'system', content: RESUME_PARSE_PROMPT },
          { role: 'user', content: text },
        ],
        temperature: 0.1,
        max_tokens: 8192,
      };

      // Groq throws 400 for some models (e.g. Qwen) if json_object is forced.
      if (!baseUrl.includes('groq.com')) {
        reqPayload.response_format = { type: 'json_object' };
      }

      const completion = await client.chat.completions.create(reqPayload);

      const raw = completion.choices[0]?.message?.content;
      if (!raw)
        throw new Error(
          `OpenAI-compatible provider at ${baseUrl} returned an empty response.`,
        );
      return this.parseJson(raw);
    } catch (error) {
      this.logger.error(
        `OpenAI-compatible API request failed: ${error.message}`,
      );
      throw error;
    }
  }

  private parseJson(raw: string): ParsedResume {
    let cleaned = raw.trim();

    // 1. Remove <think>...</think> blocks generated by reasoning models
    if (cleaned.includes('</think>')) {
      cleaned = (cleaned.split('</think>').pop() || '').trim();
    } else {
      cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    }

    // 2. Extract everything between the first { and the last }
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    
    if (start !== -1 && end !== -1 && end >= start) {
      cleaned = cleaned.substring(start, end + 1);
    } else {
      // Fallback for markdown blocks if braces aren't clearly found
      if (cleaned.startsWith('```')) {
        cleaned = cleaned
          .replace(/^```[a-z]*\n?/i, '')
          .replace(/```\s*$/i, '')
          .trim();
      }
    }

    try {
      // Remove trailing commas which are common in LLM outputs and break JSON.parse
      cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(cleaned) as ParsedResume;
    } catch (e: any) {
      this.logger.error(`JSON Parse Error: ${e.message}. Full string length: ${cleaned.length}`);
      this.logger.error(`Full extracted string: \n${cleaned}\n`);
      throw new Error(
        `Failed to parse JSON from AI provider response: ${e.message}. Raw snippet: ${cleaned.slice(0, 200)}`,
      );
    }
  }
}
