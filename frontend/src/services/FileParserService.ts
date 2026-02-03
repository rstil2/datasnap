/**
 * Enhanced File Parser Service
 * Supports CSV, JSON, XLSX, TSV with validation and preview
 */

import Papa from 'papaparse';
import ExcelJS from 'exceljs';

export interface FileParseResult {
  data: Record<string, any>[];
  headers: string[];
  metadata: {
    fileName: string;
    fileSize: number;
    fileType: string;
    rowCount: number;
    columnCount: number;
    encoding?: string;
    parseTime: number;
  };
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  preview: Record<string, any>[];
  schema: {
    columns: Array<{
      name: string;
      type: 'string' | 'number' | 'date' | 'boolean' | 'mixed';
      nullable: boolean;
      unique: boolean;
      samples: any[];
    }>;
  };
}

export interface ParseOptions {
  delimiter?: string;
  skipEmptyLines?: boolean;
  trimHeaders?: boolean;
  encoding?: string;
  maxRows?: number;
  preview?: boolean;
  previewRows?: number;
}

export interface ValidationRule {
  type: 'required' | 'type' | 'range' | 'pattern' | 'custom';
  field?: string;
  value?: any;
  message: string;
}

export class FileParserService {
  private static readonly SUPPORTED_FORMATS = ['.csv', '.tsv', '.txt', '.json', '.xlsx', '.xls'];
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly PREVIEW_ROWS = 10;
  private static readonly TYPE_DETECTION_SAMPLE = 100;

  /**
   * Check if file format is supported
   */
  static isSupported(fileName: string): boolean {
    const extension = this.getFileExtension(fileName);
    return this.SUPPORTED_FORMATS.includes(extension);
  }

  /**
   * Get file extension
   */
  private static getFileExtension(fileName: string): string {
    return fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  }

  /**
   * Validate file before parsing
   */
  static validateFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      errors.push(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum limit of ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Check file type
    if (!this.isSupported(file.name)) {
      errors.push(`Unsupported file format. Supported formats: ${this.SUPPORTED_FORMATS.join(', ')}`);
    }

    // Check if file is empty
    if (file.size === 0) {
      errors.push('File is empty');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Parse file with automatic format detection
   */
  static async parseFile(file: File, options: ParseOptions = {}): Promise<FileParseResult> {
    const startTime = performance.now();
    
    // Validate file first
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      return {
        data: [],
        headers: [],
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: this.getFileExtension(file.name),
          rowCount: 0,
          columnCount: 0,
          parseTime: performance.now() - startTime
        },
        validation: {
          isValid: false,
          errors: validation.errors,
          warnings: []
        },
        preview: [],
        schema: { columns: [] }
      };
    }

    const extension = this.getFileExtension(file.name);

    try {
      let result: FileParseResult;

      switch (extension) {
        case '.csv':
        case '.tsv':
        case '.txt':
          result = await this.parseDelimitedFile(file, extension, options);
          break;
        case '.json':
          result = await this.parseJSONFile(file, options);
          break;
        case '.xlsx':
        case '.xls':
          result = await this.parseExcelFile(file, options);
          break;
        default:
          throw new Error(`Unsupported file format: ${extension}`);
      }

      result.metadata.parseTime = performance.now() - startTime;
      return result;

    } catch (error) {
      return {
        data: [],
        headers: [],
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: extension,
          rowCount: 0,
          columnCount: 0,
          parseTime: performance.now() - startTime
        },
        validation: {
          isValid: false,
          errors: [error instanceof Error ? error.message : 'Unknown parsing error'],
          warnings: []
        },
        preview: [],
        schema: { columns: [] }
      };
    }
  }

  /**
   * Parse CSV/TSV files
   */
  private static async parseDelimitedFile(
    file: File, 
    extension: string, 
    options: ParseOptions
  ): Promise<FileParseResult> {
    return new Promise((resolve, reject) => {
      const delimiter = extension === '.tsv' ? '\t' : (options.delimiter || ',');
      
      Papa.parse(file, {
        header: true,
        delimiter,
        skipEmptyLines: options.skipEmptyLines ?? true,
        trimHeaders: options.trimHeaders ?? true,
        encoding: options.encoding || 'UTF-8',
        preview: options.maxRows || 0,
        complete: (results) => {
          try {
            const data = results.data as Record<string, any>[];
            const headers = results.meta.fields || [];
            const errors: string[] = [];
            const warnings: string[] = [];

            // Add parsing errors
            if (results.errors.length > 0) {
              results.errors.forEach(error => {
                if (error.type === 'Quotes') {
                  warnings.push(`Row ${error.row}: ${error.message}`);
                } else {
                  errors.push(`Row ${error.row}: ${error.message}`);
                }
              });
            }

            // Validate headers
            if (headers.length === 0) {
              errors.push('No headers found in file');
            }

            // Check for duplicate headers
            const duplicateHeaders = headers.filter((header, index) => 
              headers.indexOf(header) !== index
            );
            if (duplicateHeaders.length > 0) {
              warnings.push(`Duplicate headers found: ${duplicateHeaders.join(', ')}`);
            }

            // Generate schema
            const schema = this.generateSchema(data, headers);
            
            resolve({
              data,
              headers,
              metadata: {
                fileName: file.name,
                fileSize: file.size,
                fileType: extension,
                rowCount: data.length,
                columnCount: headers.length,
                encoding: options.encoding || 'UTF-8',
                parseTime: 0 // Will be set by caller
              },
              validation: {
                isValid: errors.length === 0,
                errors,
                warnings
              },
              preview: data.slice(0, options.previewRows || this.PREVIEW_ROWS),
              schema
            });
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(new Error(`CSV parsing error: ${error.message}`));
        }
      });
    });
  }

  /**
   * Parse JSON files
   */
  private static async parseJSONFile(file: File, options: ParseOptions): Promise<FileParseResult> {
    const text = await file.text();
    
    try {
      const jsonData = JSON.parse(text);
      let data: Record<string, unknown>[] = [];
      let headers: string[] = [];
      
      // Handle different JSON structures
      if (Array.isArray(jsonData)) {
        data = jsonData;
      } else if (typeof jsonData === 'object' && jsonData !== null) {
        // If it's an object, try to find array properties
        const arrayKeys = Object.keys(jsonData).filter(key => Array.isArray(jsonData[key]));
        
        if (arrayKeys.length === 1) {
          data = jsonData[arrayKeys[0]];
        } else if (arrayKeys.length > 1) {
          throw new Error('Multiple arrays found in JSON. Please specify which array to use.');
        } else {
          // Convert single object to array
          data = [jsonData];
        }
      }

      // Extract headers from first row
      if (data.length > 0) {
        headers = Object.keys(data[0]);
      }

      // Apply row limit if specified
      if (options.maxRows && data.length > options.maxRows) {
        data = data.slice(0, options.maxRows);
      }

      const schema = this.generateSchema(data, headers);

      return {
        data,
        headers,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: '.json',
          rowCount: data.length,
          columnCount: headers.length,
          parseTime: 0
        },
        validation: {
          isValid: true,
          errors: [],
          warnings: data.length === 0 ? ['JSON file contains no data arrays'] : []
        },
        preview: data.slice(0, options.previewRows || this.PREVIEW_ROWS),
        schema
      };

    } catch (error) {
      throw new Error(`JSON parsing error: ${error instanceof Error ? error.message : 'Invalid JSON format'}`);
    }
  }

  /**
   * Parse Excel files
   */
  private static async parseExcelFile(file: File, options: ParseOptions): Promise<FileParseResult> {
    const buffer = await file.arrayBuffer();
    
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      
      const worksheetNames = workbook.worksheets.map(ws => ws.name);
      if (worksheetNames.length === 0) {
        throw new Error('No sheets found in Excel file');
      }

      const worksheet = workbook.worksheets[0];
      const sheetName = worksheet.name;
      
      if (worksheet.rowCount === 0) {
        throw new Error('Excel sheet is empty');
      }

      // Convert worksheet to array of arrays
      const rawData: unknown[][] = [];
      worksheet.eachRow((row, rowNumber) => {
        const values: unknown[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          values.push(cell.value);
        });
        rawData.push(values);
      });

      if (rawData.length === 0) {
        throw new Error('Excel sheet is empty');
      }

      // Extract headers from first row
      const headers = rawData[0].map(String).filter(h => h !== '');
      
      if (headers.length === 0) {
        throw new Error('No headers found in Excel file');
      }
      
      // Convert remaining rows to objects
      const data = rawData.slice(1)
        .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
        .map((row) => {
          const rowObj: Record<string, unknown> = {};
          headers.forEach((header, index) => {
            rowObj[header] = row[index] ?? '';
          });
          return rowObj;
        })
        .filter(row => Object.values(row).some(value => value !== ''));

      // Apply row limit if specified
      const finalData = options.maxRows ? data.slice(0, options.maxRows) : data;

      const schema = this.generateSchema(finalData, headers);

      const warnings: string[] = [];
      if (worksheetNames.length > 1) {
        warnings.push(`Multiple sheets found. Using first sheet: "${sheetName}"`);
      }

      return {
        data: finalData,
        headers,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: this.getFileExtension(file.name),
          rowCount: finalData.length,
          columnCount: headers.length,
          parseTime: 0
        },
        validation: {
          isValid: true,
          errors: [],
          warnings
        },
        preview: finalData.slice(0, options.previewRows || this.PREVIEW_ROWS),
        schema
      };

    } catch (error) {
      throw new Error(`Excel parsing error: ${error instanceof Error ? error.message : 'Failed to parse Excel file'}`);
    }
  }

  /**
   * Generate schema for parsed data
   */
  private static generateSchema(data: Record<string, unknown>[], headers: string[]) {
    const sampleSize = Math.min(data.length, this.TYPE_DETECTION_SAMPLE);
    const sampleData = data.slice(0, sampleSize);

    const columns = headers.map(header => {
      const values = sampleData.map(row => row[header]).filter(val => val !== null && val !== undefined && val !== '');
      
      if (values.length === 0) {
        return {
          name: header,
          type: 'string' as const,
          nullable: true,
          unique: false,
          samples: []
        };
      }

      // Type detection
      const type = this.detectColumnType(values);
      
      // Check for nullability
      const nullable = sampleData.some(row => {
        const val = row[header];
        return val === null || val === undefined || val === '';
      });

      // Check uniqueness (for sample)
      const uniqueValues = new Set(values);
      const unique = uniqueValues.size === values.length;

      // Get sample values
      const samples = Array.from(uniqueValues).slice(0, 5);

      return {
        name: header,
        type,
        nullable,
        unique,
        samples
      };
    });

    return { columns };
  }

  /**
   * Detect column data type
   */
  private static detectColumnType(values: unknown[]): 'string' | 'number' | 'date' | 'boolean' | 'mixed' {
    if (values.length === 0) return 'string';

    const typeMap = new Map<string, number>();
    
    values.forEach(value => {
      const type = this.getValueType(value);
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });

    // If more than 80% of values are the same type, consider it that type
    const threshold = values.length * 0.8;
    
    for (const [type, count] of typeMap) {
      if (count >= threshold) {
        return type as 'string' | 'number' | 'date' | 'boolean';
      }
    }

    return 'mixed';
  }

  /**
   * Get type of individual value
   */
  private static getValueType(value: any): string {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    
    const str = String(value).trim().toLowerCase();
    
    // Boolean check
    if (['true', 'false', 'yes', 'no', '1', '0'].includes(str)) {
      return 'boolean';
    }
    
    // Number check
    if (!isNaN(Number(str)) && str !== '') {
      return 'number';
    }
    
    // Date check
    const date = new Date(str);
    if (!isNaN(date.getTime()) && str.length > 6) {
      return 'date';
    }
    
    return 'string';
  }

  /**
   * Stream large file parsing for files larger than 10MB
   * Processes file in chunks to avoid memory issues
   */
  static async parseFileStream(
    file: File, 
    onProgress?: (progress: number) => void,
    onChunk?: (chunk: Record<string, any>[]) => void
  ): Promise<FileParseResult> {
    const startTime = Date.now();
    const fileSize = file.size;
    const LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB
    
    // For smaller files, use regular parsing
    if (fileSize < LARGE_FILE_THRESHOLD) {
      return this.parseFile(file);
    }

    const extension = this.getFileExtension(file.name);
    const allData: Record<string, any>[] = [];
    let headers: string[] = [];
    let processedBytes = 0;
    
    try {
      if (extension === '.csv' || extension === '.tsv') {
        // Use Papa Parse streaming for CSV/TSV
        return new Promise((resolve, reject) => {
          const chunkData: Record<string, any>[] = [];
          const CHUNK_SIZE = 1000; // Process 1000 rows at a time
          
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            delimiter: extension === '.tsv' ? '\t' : ',',
            chunk: (results, parser) => {
              const rows = results.data as Record<string, any>[];
              
              // Get headers from first chunk
              if (headers.length === 0 && rows.length > 0) {
                headers = Object.keys(rows[0]);
              }
              
              // Process chunk
              chunkData.push(...rows);
              
              // Report progress
              processedBytes += JSON.stringify(rows).length;
              const progress = Math.min(100, (processedBytes / fileSize) * 100);
              onProgress?.(progress);
              
              // Call chunk callback
              if (onChunk && chunkData.length >= CHUNK_SIZE) {
                onChunk(chunkData.splice(0, CHUNK_SIZE));
              }
              
              // Store all data
              allData.push(...rows);
            },
            complete: () => {
              // Process final chunk
              if (onChunk && chunkData.length > 0) {
                onChunk(chunkData);
              }
              
              const parseTime = Date.now() - startTime;
              
              // Generate schema
              const schema = this.generateSchema(allData, headers);
              
              // Validate
              const validation = { isValid: true, errors: [], warnings: [] };
              
              // Get preview
              const preview = allData.slice(0, this.PREVIEW_ROWS);
              
              resolve({
                data: allData,
                headers,
                metadata: {
                  fileName: file.name,
                  fileSize: file.size,
                  fileType: extension,
                  rowCount: allData.length,
                  columnCount: headers.length,
                  parseTime
                },
                validation,
                preview,
                schema
              });
            },
            error: (error) => {
              reject(new Error(`Streaming parse error: ${error.message}`));
            }
          });
        });
      } else if (extension === '.json') {
        // For JSON, use regular parsing but with progress updates
        const text = await file.text();
        onProgress?.(25);
        
        const jsonData = JSON.parse(text);
        onProgress?.(50);
        
        // Handle different JSON structures
        let data: Record<string, any>[] = [];
        if (Array.isArray(jsonData)) {
          data = jsonData;
        } else if (typeof jsonData === 'object') {
          // Try to find array in object
          const keys = Object.keys(jsonData);
          if (keys.length === 1 && Array.isArray(jsonData[keys[0]])) {
            data = jsonData[keys[0]];
          } else {
            data = [jsonData];
          }
        }
        
        onProgress?.(75);
        
        if (data.length > 0) {
          headers = Object.keys(data[0]);
        }
        
        // Process in chunks for progress updates
        const CHUNK_SIZE = 5000;
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
          const chunk = data.slice(i, i + CHUNK_SIZE);
          allData.push(...chunk);
          onChunk?.(chunk);
          const progress = 75 + (i / data.length) * 25;
          onProgress?.(progress);
        }
        
        const parseTime = Date.now() - startTime;
        const schema = this.generateSchema(allData, headers);
        const validation = { isValid: true, errors: [], warnings: [] };
        const preview = allData.slice(0, this.PREVIEW_ROWS);
        
        onProgress?.(100);
        
        return {
          data: allData,
          headers,
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            fileType: extension,
            rowCount: allData.length,
            columnCount: headers.length,
            parseTime
          },
          validation,
          preview,
          schema
        };
      } else {
        // For other formats, fall back to regular parsing
        return this.parseFile(file);
      }
    } catch (error) {
      throw new Error(`Streaming parse failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default FileParserService;