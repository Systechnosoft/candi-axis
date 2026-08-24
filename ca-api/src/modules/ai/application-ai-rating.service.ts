import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AdminSettingsService } from '../admin/admin-settings.service';
import { AiExecutionService } from './ai-execution.service';
import OpenAI from 'openai';

export interface AiRatingResult {
  skills_analyzed: Array<{
    skill: string;
    rating: number;
    evidence: string;
    confidence: number;
  }>;
  overall_resume_score: number;
  missing_critical_skills: string[];
  notes: string;
  rating_model_version?: string;
  scoring_strategy?: string;
}

@Injectable()
export class ApplicationAiRatingService {
  private readonly logger = new Logger(ApplicationAiRatingService.name);

  constructor(
    private readonly adminService: AdminSettingsService,
    private readonly aiExecutionService: AiExecutionService,
  ) {}

  async rateApplication(
    candidate: any,
    jd: any,
    email: string,
  ): Promise<AiRatingResult> {
    this.logger.log(
      `Starting AI rating for candidate [${candidate.id}] against JD [${jd.id}] for org [${email.split('@')[1]}]`,
    );

    const systemPrompt = `
You are the AI Resume Rating Engine inside an Applicant Tracking System (ATS).
Your job is to generate project-based, skill-wise ratings based on a job description (JD) and a candidate's resume.

Follow these rules exactly:

1. Extract the Top 5 most important skills from the JD (Prioritize "Must have", mentioned multiple times, tied to deliverables).
2. Detect tools & technologies used in the Candidate's Resume, prioritizing depth, frequency, recency, and project context.

Provide the output ONLY as a valid JSON object with these keys:
{
  "skills_analyzed": [
    {
      "skill": "Required JD skill",
      "rating": 0, // (0-10) Based ONLY on project-level usage
      "evidence": "Cite EXACT lines from resume",
      "confidence": 0 // (0-1)
    }
  ],
  "overall_resume_score": 0, // Mean of the 5 skill ratings (0-10)
  "missing_critical_skills": [], // Skills not found in resume
  "notes": "Any additional observations",
  "rating_model_version": "v2.skill_project_based",
  "scoring_strategy": "project_evidence_weighted"
}

SKILL RATING LOGIC:
0: No evidence
1: Buzzword mention only (Score 2-3)
2: Basic usage in a small feature (Score 4-5)
3: Solid working experience across multiple projects (Score 6-7)
4: Advanced / Deep usage, complex systems, ownership (Score 8-9)
5: Expert / Leadership-level, end-to-end ownership (Score 10)

ADDITIONAL RULES:
- Penalize experience older than 3 years by 15%
- Penalize skills not used recently
- Normalization: If projects are weak, do not inflate rating artificially.
- Evidence-First: Never give a high rating without Project name, Tasks, Metrics, and Role.
- NEVER infer skills without evidence or mix JD skills with resume skills.
`;

    const inputData = {
      candidate: {
        full_name: candidate.full_name,
        profile_summary: candidate.profile_summary,
        total_exp_months: candidate.total_exp_months,
        educations: candidate.educations,
        employments: candidate.employments,
      },
      jd: {
        title: jd.title,
        must_have: jd.must_have_text,
        nice_to_have: jd.nice_to_have_text,
        summary: jd.job_summary,
      },
    };

    const config = await this.adminService.getAiConfigForOrg(email);
    const provider = (config.provider || 'gemini').toLowerCase();
    const modelName = config.model;
    const baseUrl = config.base_url;

    if (provider !== 'gemini' && !baseUrl) {
      throw new Error(
        `Provider "${provider}" requires a base URL. Please configure it in Site Configuration.`,
      );
    }

    const prompt = `${systemPrompt}\n\nData for Evaluation:\n${JSON.stringify(inputData, null, 2)}`;

    try {
      const content = await this.aiExecutionService.executeWithFailover(
        email,
        provider,
        async (apiKey) => {
          if (provider === 'gemini') {
            this.logger.log(
              `Calling Gemini API for application rating - model: ${modelName}`,
            );
            const genAI = new GoogleGenerativeAI(apiKey);
            const geminiModel = genAI.getGenerativeModel({
              model: modelName,
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
              },
            });
            const result = await geminiModel.generateContent(prompt);
            return result.response.text() || '';
          } else {
            this.logger.log(
              `Calling OpenAI-compatible API for application rating - baseUrl: ${baseUrl}, model: ${modelName}`,
            );
            const client = new OpenAI({ apiKey, baseURL: baseUrl });

            const reqPayload: any = {
              model: modelName,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.1,
            };

            if (!baseUrl?.includes('groq.com')) {
              reqPayload.response_format = { type: 'json_object' };
            }

            const completion = await client.chat.completions.create(reqPayload);
            return completion.choices[0]?.message?.content || '';
          }
        },
      );

      if (!content) {
        throw new Error('AI provider returned empty content.');
      }

      let jsonString = content.trim();
      if (jsonString.startsWith('```')) {
        jsonString = jsonString
          .replace(/^```[a-z]*\n?/i, '')
          .replace(/```\s*$/i, '')
          .trim();
      }

      const rating = JSON.parse(jsonString) as AiRatingResult;
      return rating;
    } catch (error) {
      this.logger.error(
        `Failed to generate AI rating using ${provider}:`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
