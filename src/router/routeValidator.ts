import { routeExists, getRouteByName } from './routeRegistry';
import { getNavbarActions } from './navbarActions';

// Route validation system
export class RouteValidator {
  private static instance: RouteValidator;
  private validatedRoutes = new Set<string>();

  static getInstance(): RouteValidator {
    if (!RouteValidator.instance) {
      RouteValidator.instance = new RouteValidator();
    }
    return RouteValidator.instance;
  }

  // Validate all routes referenced in navbar
  validateNavbarRoutes(): void {
    const navbarActions = getNavbarActions({ isSuperAdmin: true, isAdmin: true });
    
    navbarActions.forEach(action => {
      const routeName = action.buttonLink.name;
      this.validateRoute(routeName);
    });
  }

  // Validate a single route
  validateRoute(routeName: string): boolean {
    if (this.validatedRoutes.has(routeName)) {
      return true;
    }

    if (!routeExists(routeName)) {
      console.error(`❌ Route '${routeName}' does not exist in route registry!`);
      console.error(`   Please add it to src/router/routeRegistry.ts`);
      return false;
    }

    const route = getRouteByName(routeName);
    if (route) {
      console.log(`✅ Route '${routeName}' is valid (${route.path})`);
    }

    this.validatedRoutes.add(routeName);
    return true;
  }

  // Get all missing routes
  getMissingRoutes(): string[] {
    const navbarActions = getNavbarActions({ isSuperAdmin: true, isAdmin: true });
    const missingRoutes: string[] = [];

    navbarActions.forEach(action => {
      const routeName = action.buttonLink.name;
      if (!routeExists(routeName)) {
        missingRoutes.push(routeName);
      }
    });

    return missingRoutes;
  }

  // Validate all routes and return summary
  validateAll(): { valid: boolean; missingRoutes: string[]; totalRoutes: number } {
    const missingRoutes = this.getMissingRoutes();
    const navbarActions = getNavbarActions({ isSuperAdmin: true, isAdmin: true });
    
    return {
      valid: missingRoutes.length === 0,
      missingRoutes,
      totalRoutes: navbarActions.length
    };
  }
}

// Development helper - validate routes on startup
if (import.meta.env.DEV) {
  const validator = RouteValidator.getInstance();
  const result = validator.validateAll();
  
  if (!result.valid) {
    console.warn('🚨 Route validation failed!');
    console.warn(`Missing routes: ${result.missingRoutes.join(', ')}`);
    console.warn('Please add missing routes to src/router/routeRegistry.ts');
  } else {
    console.log(`✅ All ${result.totalRoutes} navbar routes are valid!`);
  }
} 