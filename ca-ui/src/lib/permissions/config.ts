/**
 * RBAC/Permission config mapping UI routes to modules.
 */
export const ROUTE_MODULE_MAP: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/tasks': 'feedback',
  '/requisitions': 'requisitions',
  '/job-descriptions': 'job_descriptions',
  '/job-postings': 'job_descriptions',
  '/candidates': 'candidates',
  '/interviews': 'interviews',
  '/offers': 'offers',
  '/tags': '',
  '/notifications': '',
  '/admin/organisations': 'organisations',
  '/admin': 'users',
};

/**
 * Returns the required module for a given path, handling exact matches and nested path segments.
 * Unmapped protected routes will explicitly return null (fail closed).
 */
export function getRequiredModuleForPath(pathname: string): string | null {
  // Strip query strings and hashes
  const cleanPath = pathname.split('?')[0].split('#')[0];
  
  // Sort routes by segment length descending to ensure deep match before shallow match
  const routes = Object.keys(ROUTE_MODULE_MAP).sort((a, b) => b.length - a.length);
  
  for (const route of routes) {
    if (cleanPath === route || cleanPath.startsWith(`${route}/`)) {
      return ROUTE_MODULE_MAP[route];
    }
  }
  
  return null;
}
