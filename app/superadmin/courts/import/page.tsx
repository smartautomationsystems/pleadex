import { useState } from 'react';

export default function ImportCourtsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Import Courts Data</h1>
      <div className="mb-4">
        <p className="text-gray-600 mb-2">Paste your courts data below:</p>
        <textarea
          className="w-full h-64 p-4 border rounded-lg font-mono text-sm"
          placeholder="Paste the courts data here..."
        />
      </div>
      <div className="flex gap-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Format Data
        </button>
        <button
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Import to Database
        </button>
      </div>
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Formatted Data Preview</h2>
        <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96">
          {/* Formatted data will appear here */}
        </pre>
      </div>
    </div>
  );
} 