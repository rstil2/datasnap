// Browser polyfills to handle CommonJS/Node.js compatibility issues

// Polyfill global if it doesn't exist
if (typeof globalThis === 'undefined') {
  (window as any).globalThis = window;
}

// Polyfill process.env for browser environment
if (typeof process === 'undefined') {
  (window as any).process = {
    env: {
      NODE_ENV: 'development',
    },
    browser: true,
  };
}

// Polyfill require for any stubborn CommonJS modules
if (typeof require === 'undefined') {
  (window as any).require = (moduleId: string) => {
    console.warn(`require() called for ${moduleId} - this should not happen in browser environment`);
    throw new Error(`Module ${moduleId} not found - require() is not available in browser environment`);
  };
}

// Polyfill module.exports if any module tries to use it
if (typeof module === 'undefined') {
  (window as any).module = { exports: {} };
}

// Export empty object to satisfy module requirements
export {};