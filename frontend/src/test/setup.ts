import '@testing-library/jest-dom';

// Mock file-saver
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

// Mock html2canvas
vi.mock('html2canvas', () => ({
  default: vi.fn(() => Promise.resolve({
    toDataURL: vi.fn(() => 'data:image/png;base64,mock-canvas-data'),
    getContext: vi.fn(() => ({
      drawImage: vi.fn(),
      getImageData: vi.fn(),
    })),
  })),
}));

// Mock jsPDF
vi.mock('jspdf', () => ({
  jsPDF: vi.fn(() => ({
    addImage: vi.fn(),
    text: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    addPage: vi.fn(),
    save: vi.fn(),
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    },
  })),
}));

// Mock PptxGenJS
vi.mock('pptxgenjs', () => ({
  default: vi.fn(() => ({
    addSlide: vi.fn(() => ({
      addText: vi.fn(),
      addImage: vi.fn(),
      addChart: vi.fn(),
    })),
    writeFile: vi.fn(() => Promise.resolve()),
    layout: 'LAYOUT_16x9',
    SchemeColor: {
      accent1: 'accent1',
      accent2: 'accent2',
    },
  })),
}));

// Mock ExcelJS
vi.mock('exceljs', () => ({
  default: {
    Workbook: vi.fn(() => ({
      addWorksheet: vi.fn(() => ({
        addRow: vi.fn(),
        getRow: vi.fn(() => ({
          eachCell: vi.fn((callback: (cell: any) => void) => {
            // Mock cell for testing
            const mockCell = {
              font: {},
              fill: {},
              alignment: {}
            };
            callback(mockCell);
          })
        })),
        getColumn: vi.fn(() => ({
          width: 15
        })),
        getCell: vi.fn(() => ({
          font: {},
          fill: {},
          alignment: {}
        })),
        lastRow: { number: 1 },
        autoFilter: {}
      })),
      xlsx: {
        writeBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(8))),
        load: vi.fn(() => Promise.resolve())
      },
      worksheets: [{ name: 'Sheet1' }]
    }))
  }
}));

// Mock Canvas for chart rendering
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Array(4) })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: new Array(4) })),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL for file operations
Object.defineProperty(URL, 'createObjectURL', {
  value: vi.fn(() => 'blob:mock-url'),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: vi.fn(),
});

// Mock window.open for export operations
Object.defineProperty(window, 'open', {
  value: vi.fn(),
});

// Fix for Vitest deprecation warning
Object.defineProperty(globalThis, '__vitest_worker__', {
  value: { config: { deps: { inline: ['file-saver', 'html2canvas', 'jspdf', 'pptxgenjs', 'exceljs'] } } },
  writable: true,
});
