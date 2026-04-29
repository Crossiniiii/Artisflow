// Performance monitoring utilities

export const measurePerformance = (name: string, fn: () => void | Promise<void>) => {
  const start = performance.now();
  
  const result = fn();
  
  if (result instanceof Promise) {
    return result.then(() => {
      const end = performance.now();
      console.log(`[Performance] ${name}: ${end - start}ms`);
    });
  } else {
    const end = performance.now();
    console.log(`[Performance] ${name}: ${end - start}ms`);
  }
};

export const logPageLoad = () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
      console.log(`[Performance] Page load time: ${loadTime}ms`);
    });
  }
};

export const logLCP = () => {
  if (typeof window !== 'undefined') {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log(`[Performance] LCP: ${lastEntry.startTime}ms`);
    }).observe({ entryTypes: ['largest-contentful-paint'] });
  }
};

export const logFID = () => {
  if (typeof window !== 'undefined') {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        console.log(`[Performance] FID: ${entry.startTime}ms`);
      });
    }).observe({ entryTypes: ['first-input'] });
  }
};

export const logCLS = () => {
  if (typeof window !== 'undefined') {
    let clsValue = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      });
      console.log(`[Performance] CLS: ${clsValue}`);
    }).observe({ entryTypes: ['layout-shift'] });
  }
};

// Initialize performance monitoring
export const initPerformanceMonitoring = () => {
  logPageLoad();
  logLCP();
  logFID();
  logCLS();
};
