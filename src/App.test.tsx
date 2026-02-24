import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock IndexedDB (Dexie) — App requiere IndexedDB para renderizar
jest.mock('./hooks/useIndexedDB', () => ({
  useIndexedDB: () => ({
    db: { properties: [], tenants: [], employees: [], config: { companyName: 'UNS-KIKAKU', closingDay: 0, defaultCleaningFee: 30000 } },
    setDb: jest.fn(),
    isLoading: false,
    resetDb: jest.fn(),
  }),
}));

// Mock useExcelImport
jest.mock('./hooks/useExcelImport', () => ({
  useExcelImport: () => ({
    importStatus: { type: '', msg: '' },
    setImportStatus: jest.fn(),
    previewData: [],
    detectedType: null,
    previewSummary: '',
    processExcelFile: jest.fn(),
    saveToDatabase: jest.fn(),
  }),
}));

test('renders UNS Estate OS header', () => {
  render(<App />);
  expect(screen.getByText(/UNS-KIKAKU/i)).toBeInTheDocument();
  expect(screen.getByText(/Jpkken-OS Elite v7/i)).toBeInTheDocument();
});

test('renders dashboard by default', () => {
  render(<App />);
  expect(screen.getByText(/Bienvenido a/i)).toBeInTheDocument();
});
