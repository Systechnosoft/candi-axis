import { getRequiredModuleForPath } from './config';

describe('Permissions Config - Route Matching', () => {
  it('should match an exact top-level route', () => {
    expect(getRequiredModuleForPath('/dashboard')).toBe('dashboard');
    expect(getRequiredModuleForPath('/tasks')).toBe('feedback');
    expect(getRequiredModuleForPath('/requisitions')).toBe('requisitions');
  });

  it('should match a nested route correctly', () => {
    expect(getRequiredModuleForPath('/tasks/123')).toBe('feedback');
    expect(getRequiredModuleForPath('/requisitions/req-abc/edit')).toBe('requisitions');
    expect(getRequiredModuleForPath('/admin/organisations/new')).toBe('organisations');
  });

  it('should resolve deeper nested routes before shallower ones', () => {
    // /admin/organisations should resolve to 'organisations', not 'users'
    expect(getRequiredModuleForPath('/admin/organisations')).toBe('organisations');
    // /admin alone should resolve to 'users'
    expect(getRequiredModuleForPath('/admin')).toBe('users');
  });

  it('should fail closed (return null) for unmapped partial-prefix routes', () => {
    // Starts with /tasks-foo, should NOT match /tasks
    expect(getRequiredModuleForPath('/tasks-foo')).toBeNull();
    // Starts with /administrator, should NOT match /admin
    expect(getRequiredModuleForPath('/administrator')).toBeNull();
  });

  it('should fail closed (return null) for completely unmapped routes', () => {
    expect(getRequiredModuleForPath('/unknown')).toBeNull();
    expect(getRequiredModuleForPath('/settings')).toBeNull(); // assuming settings is not in map
  });

  it('should ignore query strings and hash fragments', () => {
    expect(getRequiredModuleForPath('/tasks?page=2')).toBe('feedback');
    expect(getRequiredModuleForPath('/requisitions#top')).toBe('requisitions');
    expect(getRequiredModuleForPath('/admin/organisations/123?sort=desc#bottom')).toBe('organisations');
    // partial prefix with query
    expect(getRequiredModuleForPath('/tasks-foo?id=1')).toBeNull();
  });
});
