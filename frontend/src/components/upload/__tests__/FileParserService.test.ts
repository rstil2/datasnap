import { vi } from 'vitest';
import { FileParserService } from '../../../services/FileParserService';

describe('FileParserService', () => {
  describe('File format detection', () => {
    test('should support CSV files', () => {
      expect(FileParserService.isSupported('test.csv')).toBe(true);
      expect(FileParserService.isSupported('TEST.CSV')).toBe(true);
    });

    test('should support TSV files', () => {
      expect(FileParserService.isSupported('test.tsv')).toBe(true);
      expect(FileParserService.isSupported('TEST.TSV')).toBe(true);
    });

    test('should support JSON files', () => {
      expect(FileParserService.isSupported('test.json')).toBe(true);
      expect(FileParserService.isSupported('TEST.JSON')).toBe(true);
    });

    test('should support Excel files', () => {
      expect(FileParserService.isSupported('test.xlsx')).toBe(true);
      expect(FileParserService.isSupported('test.xls')).toBe(true);
      expect(FileParserService.isSupported('TEST.XLSX')).toBe(true);
    });

    test('should reject unsupported files', () => {
      expect(FileParserService.isSupported('test.pdf')).toBe(false);
      expect(FileParserService.isSupported('test.doc')).toBe(false);
      expect(FileParserService.isSupported('test.png')).toBe(false);
    });
  });

  describe('File validation', () => {
    test('should validate file size', () => {
      // Create a mock file that's too large
      const largeFile = new File([''], 'test.csv', { 
        type: 'text/csv' 
      });
      
      // Mock the size property
      Object.defineProperty(largeFile, 'size', {
        value: 200 * 1024 * 1024, // 200MB
        writable: false
      });

      const result = FileParserService.validateFile(largeFile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File size (200.0MB) exceeds maximum limit of 100MB');
    });

    test('should reject empty files', () => {
      const emptyFile = new File([''], 'test.csv', { type: 'text/csv' });
      
      const result = FileParserService.validateFile(emptyFile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File is empty');
    });

    test('should reject unsupported file types', () => {
      const unsupportedFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(unsupportedFile, 'size', { value: 1024, writable: false });
      
      const result = FileParserService.validateFile(unsupportedFile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unsupported file format. Supported formats: .csv, .tsv, .txt, .json, .xlsx, .xls');
    });

    test('should validate supported files', () => {
      const validFile = new File(['name,age\nJohn,25'], 'test.csv', { type: 'text/csv' });
      Object.defineProperty(validFile, 'size', { value: 1024, writable: false });
      
      const result = FileParserService.validateFile(validFile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('parseFile method', () => {
    test('should return error for invalid files', async () => {
      const invalidFile = new File([''], 'test.pdf', { type: 'application/pdf' });
      
      const result = await FileParserService.parseFile(invalidFile);
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors.length).toBeGreaterThan(0);
      expect(result.data).toHaveLength(0);
    });

    test('should handle CSV files', async () => {
      const csvContent = 'name,age,city\nJohn,25,New York\nJane,30,Los Angeles';
      const csvFile = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await FileParserService.parseFile(csvFile);
      
      expect(result.validation.isValid).toBe(true);
      expect(result.headers).toEqual(['name', 'age', 'city']);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ name: 'John', age: '25', city: 'New York' });
      expect(result.metadata.fileType).toBe('.csv');
    });

    test('should handle JSON files with array data', async () => {
      const jsonContent = JSON.stringify([
        { name: 'John', age: 25, city: 'New York' },
        { name: 'Jane', age: 30, city: 'Los Angeles' }
      ]);
      const jsonFile = new File([jsonContent], 'test.json', { type: 'application/json' });
      Object.defineProperty(jsonFile, 'size', { value: jsonContent.length, writable: false });
      
      // Mock the text() method for the File object
      jsonFile.text = vi.fn().mockResolvedValue(jsonContent);
      
      const result = await FileParserService.parseFile(jsonFile);
      
      expect(result.validation.isValid).toBe(true);
      expect(result.headers).toEqual(['name', 'age', 'city']);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ name: 'John', age: 25, city: 'New York' });
      expect(result.metadata.fileType).toBe('.json');
    });

    test('should generate correct schema', async () => {
      const csvContent = 'name,age,salary,is_active\nJohn,25,50000.5,true\nJane,30,75000,false\nBob,,60000,true';
      const csvFile = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await FileParserService.parseFile(csvFile);
      
      expect(result.schema.columns).toHaveLength(4);
      
      const nameColumn = result.schema.columns.find(col => col.name === 'name');
      expect(nameColumn?.type).toBe('string');
      expect(nameColumn?.nullable).toBe(false);
      
      const ageColumn = result.schema.columns.find(col => col.name === 'age');
      expect(ageColumn?.type).toBe('number');
      expect(ageColumn?.nullable).toBe(true); // Bob has empty age
      
      const salaryColumn = result.schema.columns.find(col => col.name === 'salary');
      expect(salaryColumn?.type).toBe('number');
      
      const activeColumn = result.schema.columns.find(col => col.name === 'is_active');
      expect(activeColumn?.type).toBe('boolean');
    });

    test('should respect maxRows option', async () => {
      const csvContent = 'name,age\nJohn,25\nJane,30\nBob,35\nAlice,40';
      const csvFile = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await FileParserService.parseFile(csvFile, { maxRows: 2 });
      
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({ name: 'John', age: '25' });
      expect(result.data[1]).toEqual({ name: 'Jane', age: '30' });
    });

    test('should provide preview data', async () => {
      const csvContent = 'name,age\n' + Array.from({ length: 50 }, (_, i) => `Person${i},${20 + i}`).join('\n');
      const csvFile = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await FileParserService.parseFile(csvFile, { previewRows: 5 });
      
      expect(result.data).toHaveLength(50);
      expect(result.preview).toHaveLength(5);
      expect(result.preview[0]).toEqual({ name: 'Person0', age: '20' });
    });
  });
});