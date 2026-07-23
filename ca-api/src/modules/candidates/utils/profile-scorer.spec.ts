import { calculateProfileScore } from './profile-scorer';

describe('Profile Scorer', () => {
  it('should calculate a high score for a complete profile', () => {
    const candidate = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone: '1234567890',
      location: 'New York, NY',
      profile_summary: 'Experienced Software Engineer with a demonstrated history of working in the computer software industry. Skilled in Node.js, React, and SQL.',
      total_exp_months: 120, // 10 years
      gap_details: '',
    };

    const educations = [
      { is_highest: true, degree: 'Bachelor of Science in Computer Science' }
    ];

    const employments = [
      { is_current: true, job_title: 'Senior Software Engineer', responsibilities_summary: 'Led a team of developers to build high-performance web applications. Increased conversion rate by 15%.' },
      { is_current: false, job_title: 'Software Engineer', responsibilities_summary: 'Developed microservices using Node.js and PostgreSQL. Improved query performance by 25%.' },
      { is_current: false, job_title: 'Junior Developer', responsibilities_summary: 'Maintained legacy applications.' }
    ];

    const certifications = [
      { certification_name: 'AWS Certified Solutions Architect' }
    ];

    const socialLinks = [
      { url: 'https://linkedin.com/in/johndoe' },
      { url: 'https://github.com/johndoe' }
    ];

    const projects = [
      { title: 'Project Alpha', description: 'A high-scale e-commerce platform built with Next.js.' }
    ];

    const tags = [
      { name: 'JavaScript' }, { name: 'TypeScript' }, { name: 'Node.js' },
      { name: 'React' }, { name: 'PostgreSQL' }, { name: 'AWS' },
      { name: 'Docker' }, { name: 'Git' }, { name: 'Redis' },
      { name: 'Jest' }
    ];

    const score = calculateProfileScore(
      candidate,
      educations,
      employments,
      certifications,
      socialLinks,
      projects,
      tags
    );

    // It should calculate a high score since all criteria are met
    expect(score).toBeGreaterThan(80);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should calculate a lower score for a sparse profile', () => {
    const candidate = {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      location: '',
      profile_summary: '',
      total_exp_months: 0,
      gap_details: '',
    };

    const score = calculateProfileScore(
      candidate,
      [],
      [],
      [],
      [],
      [],
      []
    );

    expect(score).toBeLessThan(30);
  });
});
