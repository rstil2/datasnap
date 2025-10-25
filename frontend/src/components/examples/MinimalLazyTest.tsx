import React from 'react';

// Minimal test component to check if the issue is with our lazy loading system
export const MinimalLazyTest: React.FC = () => {
  const [loaded, setLoaded] = React.useState(false);
  
  const handleLoad = async () => {
    try {
      console.log('Testing dynamic import...');
      // Test a simple dynamic import without our lazy loading system
      const module = await import('../visualization/charts/LineChart');
      console.log('Module loaded:', module);
      setLoaded(true);
    } catch (error) {
      console.error('Failed to load module:', error);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Lazy Loading Test</h2>
      <p>This component tests basic dynamic imports to isolate the "require is undefined" error.</p>
      
      <button onClick={handleLoad} style={{ margin: '1rem 0' }}>
        Test Dynamic Import
      </button>
      
      {loaded && <p style={{ color: 'green' }}>✓ Dynamic import successful!</p>}
      
      <div style={{ marginTop: '2rem' }}>
        <h3>Environment Info:</h3>
        <ul>
          <li>Window defined: {typeof window !== 'undefined' ? 'Yes' : 'No'}</li>
          <li>Process defined: {typeof process !== 'undefined' ? 'Yes' : 'No'}</li>
          <li>Module defined: {typeof module !== 'undefined' ? 'Yes' : 'No'}</li>
          <li>Require defined: {typeof require !== 'undefined' ? 'Yes' : 'No'}</li>
          <li>Import.meta defined: {typeof import.meta !== 'undefined' ? 'Yes' : 'No'}</li>
        </ul>
      </div>
    </div>
  );
};

export default MinimalLazyTest;