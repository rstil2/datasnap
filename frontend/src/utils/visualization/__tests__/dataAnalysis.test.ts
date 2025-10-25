import { describe, it, expect } from 'vitest';

// Test data analysis utilities used by charts
describe('Data Analysis Utilities', () => {
  describe('Statistical Calculations', () => {
    it('should calculate basic statistics', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      expect(sum).toBe(55);
      expect(mean).toBe(5.5);
      expect(min).toBe(1);
      expect(max).toBe(10);
    });

    it('should calculate median correctly', () => {
      const oddValues = [1, 3, 5, 7, 9];
      const evenValues = [1, 2, 3, 4, 5, 6];
      
      // Odd number of values
      const sortedOdd = [...oddValues].sort((a, b) => a - b);
      const medianOdd = sortedOdd[Math.floor(sortedOdd.length / 2)];
      expect(medianOdd).toBe(5);
      
      // Even number of values
      const sortedEven = [...evenValues].sort((a, b) => a - b);
      const medianEven = (sortedEven[sortedEven.length / 2 - 1] + sortedEven[sortedEven.length / 2]) / 2;
      expect(medianEven).toBe(3.5);
    });

    it('should handle standard deviation calculation', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      
      const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      expect(mean).toBe(5);
      expect(stdDev).toBeCloseTo(2, 1);
    });

    it('should handle quartile calculations', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].sort((a, b) => a - b);
      const n = values.length;
      
      const q1Index = Math.floor(n * 0.25);
      const q2Index = Math.floor(n * 0.5);
      const q3Index = Math.floor(n * 0.75);
      
      const q1 = values[q1Index];
      const q2 = values[q2Index];
      const q3 = values[q3Index];
      
      // For array [1,2,3,4,5,6,7,8,9,10,11,12] with 12 elements:
      // q1Index = floor(12 * 0.25) = floor(3) = 3, values[3] = 4
      // q2Index = floor(12 * 0.5) = floor(6) = 6, values[6] = 7  
      // q3Index = floor(12 * 0.75) = floor(9) = 9, values[9] = 10
      expect(q1).toBe(4);
      expect(q2).toBe(7);
      expect(q3).toBe(10);
    });
  });

  describe('Data Validation', () => {
    it('should identify numeric values', () => {
      const testValues = [123, '456', 'abc', null, undefined, true, false];
      
      const isNumeric = (val: any): boolean => {
        if (val === null || val === undefined) return false;
        return !isNaN(parseFloat(String(val))) && isFinite(Number(val));
      };
      
      const numericValues = testValues.filter(isNumeric);
      expect(numericValues).toEqual([123, '456']);
    });

    it('should identify date values', () => {
      const testValues = [
        '2024-01-01',
        new Date('2024-01-02'),
        '2024/01/03',
        'invalid-date',
        null,
        undefined,
        123
      ];
      
      const isValidDate = (val: any): boolean => {
        if (!val) return false;
        const date = new Date(val);
        return date instanceof Date && !isNaN(date.getTime());
      };
      
      const validDates = testValues.filter(isValidDate);
      
      // Note: 123 is also a valid date (123ms since epoch), so we expect 4 valid dates
      expect(validDates).toHaveLength(4);
    });

    it('should handle missing values', () => {
      const dataWithMissing = [
        { id: 1, value: 100 },
        { id: 2, value: null },
        { id: 3, value: undefined },
        { id: 4, value: 200 },
        { id: 5, value: '' },
      ];
      
      const validValues = dataWithMissing.filter(item => 
        item.value !== null && 
        item.value !== undefined && 
        item.value !== ''
      );
      
      expect(validValues).toHaveLength(2);
      expect(validValues.map(v => v.value)).toEqual([100, 200]);
    });
  });

  describe('Data Aggregation', () => {
    it('should group data by category', () => {
      const data = [
        { category: 'A', value: 100 },
        { category: 'B', value: 150 },
        { category: 'A', value: 50 },
        { category: 'C', value: 200 },
        { category: 'B', value: 75 },
      ];
      
      const grouped = data.reduce((acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item.value);
        return acc;
      }, {} as Record<string, number[]>);
      
      expect(grouped['A']).toEqual([100, 50]);
      expect(grouped['B']).toEqual([150, 75]);
      expect(grouped['C']).toEqual([200]);
    });

    it('should aggregate values by operation', () => {
      const data = [
        { category: 'A', value: 100 },
        { category: 'A', value: 50 },
        { category: 'B', value: 150 },
        { category: 'B', value: 75 },
      ];
      
      const sumByCategory = data.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.value;
        return acc;
      }, {} as Record<string, number>);
      
      const avgByCategory = Object.entries(sumByCategory).reduce((acc, [key, sum]) => {
        const count = data.filter(item => item.category === key).length;
        acc[key] = sum / count;
        return acc;
      }, {} as Record<string, number>);
      
      expect(sumByCategory['A']).toBe(150);
      expect(sumByCategory['B']).toBe(225);
      expect(avgByCategory['A']).toBe(75);
      expect(avgByCategory['B']).toBe(112.5);
    });
  });

  describe('Data Transformation', () => {
    it('should normalize values to 0-1 range', () => {
      const values = [10, 20, 30, 40, 50];
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      const normalized = values.map(value => (value - min) / (max - min));
      
      expect(normalized[0]).toBe(0);
      expect(normalized[4]).toBe(1);
      expect(normalized[2]).toBe(0.5);
    });

    it('should bin continuous data', () => {
      const values = [1, 5, 12, 18, 23, 28, 35, 42, 47, 55];
      const binCount = 5;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const binSize = (max - min) / binCount;
      
      const bins = Array.from({ length: binCount }, (_, i) => ({
        min: min + (i * binSize),
        max: min + ((i + 1) * binSize),
        count: 0,
        values: [] as number[],
      }));
      
      values.forEach(value => {
        const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1);
        bins[binIndex].count++;
        bins[binIndex].values.push(value);
      });
      
      expect(bins).toHaveLength(5);
      expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(values.length);
    });

    it('should handle time series data', () => {
      const timeSeries = [
        { date: '2024-01-01', value: 100 },
        { date: '2024-01-02', value: 150 },
        { date: '2024-01-03', value: 120 },
        { date: '2024-01-04', value: 180 },
      ];
      
      const sortedByDate = timeSeries.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      const datesAscending = sortedByDate.map(item => item.date);
      expect(datesAscending).toEqual(['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04']);
      
      // Calculate moving average
      const windowSize = 2;
      const movingAverage = sortedByDate.map((_, index) => {
        if (index < windowSize - 1) return null;
        
        const window = sortedByDate.slice(index - windowSize + 1, index + 1);
        const sum = window.reduce((acc, item) => acc + item.value, 0);
        return sum / windowSize;
      });
      
      expect(movingAverage[0]).toBe(null);
      expect(movingAverage[1]).toBe(125); // (100 + 150) / 2
      expect(movingAverage[2]).toBe(135); // (150 + 120) / 2
    });
  });

  describe('Outlier Detection', () => {
    it('should detect outliers using IQR method', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100]; // 100 is outlier
      const sorted = [...values].sort((a, b) => a - b);
      
      const q1Index = Math.floor(sorted.length * 0.25);
      const q3Index = Math.floor(sorted.length * 0.75);
      const q1 = sorted[q1Index];
      const q3 = sorted[q3Index];
      const iqr = q3 - q1;
      
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      
      const outliers = values.filter(value => value < lowerBound || value > upperBound);
      const inliers = values.filter(value => value >= lowerBound && value <= upperBound);
      
      expect(outliers).toContain(100);
      expect(inliers).not.toContain(100);
    });

    it('should detect outliers using z-score method', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100]; // 100 is outlier
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      const zThreshold = 2;
      const outliers = values.filter(value => {
        const zScore = Math.abs((value - mean) / stdDev);
        return zScore > zThreshold;
      });
      
      expect(outliers).toContain(100);
    });
  });
});