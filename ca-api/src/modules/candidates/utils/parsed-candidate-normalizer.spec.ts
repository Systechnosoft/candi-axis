import {
  normalizeResumeDateToPgDate,
  normalizeYear,
  splitDegreeAndField,
  normalizeCandidateChildData,
} from './parsed-candidate-normalizer';

describe('ParsedCandidateNormalizer', () => {
  describe('normalizeResumeDateToPgDate', () => {
    it('should convert "Jan 2022" to "2022-01-01"', () => {
      expect(normalizeResumeDateToPgDate('Jan 2022')).toBe('2022-01-01');
    });

    it('should convert "January 2022" to "2022-01-01"', () => {
      expect(normalizeResumeDateToPgDate('January 2022')).toBe('2022-01-01');
    });

    it('should convert "2022" to "2022-01-01"', () => {
      expect(normalizeResumeDateToPgDate('2022')).toBe('2022-01-01');
    });

    it('should return null for "Present" end date', () => {
      expect(normalizeResumeDateToPgDate('Present', true)).toBeNull();
    });

    it('should return null for "Current" end date', () => {
      expect(normalizeResumeDateToPgDate('Current', true)).toBeNull();
    });

    it('should return null for invalid date', () => {
      expect(normalizeResumeDateToPgDate('Invalid Date')).toBeNull();
    });
  });

  describe('normalizeYear', () => {
    it('should convert "2016" to "2016"', () => {
      expect(normalizeYear('2016')).toBe('2016');
    });

    it('should preserve "Jan 2016"', () => {
      expect(normalizeYear('Jan 2016')).toBe('Jan 2016');
    });

    it('should return null for empty year', () => {
      expect(normalizeYear('')).toBeNull();
    });
  });

  describe('splitDegreeAndField', () => {
    it('should split "B.Tech in Computer Science"', () => {
      const res = splitDegreeAndField('B.Tech in Computer Science');
      expect(res.degree).toBe('B.Tech');
      expect(res.field_of_study).toBe('Computer Science');
    });

    it('should split "Bachelor of Technology - Information Technology"', () => {
      const res = splitDegreeAndField(
        'Bachelor of Technology - Information Technology',
      );
      expect(res.degree).toBe('Bachelor of Technology');
      expect(res.field_of_study).toBe('Information Technology');
    });

    it('should return full text as degree if no separator', () => {
      const res = splitDegreeAndField('MCA');
      expect(res.degree).toBe('MCA');
      expect(res.field_of_study).toBeNull();
    });
  });

  describe('normalizeCandidateChildData', () => {
    it('should normalize employment date ranges', () => {
      const data = {
        employments: [
          { company_name: 'Tech Corp', start_date: 'Jan 2020 - Present' },
        ],
      };
      const res = normalizeCandidateChildData(data);
      expect(res.employments[0].start_date).toBe('2020-01-01');
      expect(res.employments[0].end_date).toBeNull();
      expect(res.employments[0].is_current).toBe(true);
    });

    it('should normalize education years and split degree', () => {
      const data = {
        educations: [{ degree: 'B.Tech in CS', start_year: '2016 - 2020' }],
      };
      const res = normalizeCandidateChildData(data);
      expect(res.educations[0].degree).toBe('B.Tech');
      expect(res.educations[0].field_of_study).toBe('CS');
      expect(res.educations[0].start_year).toBe('2016');
      expect(res.educations[0].end_year).toBe('2020');
    });
  });
});
