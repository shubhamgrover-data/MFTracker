import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { parseExcelFile } from '../services/dataService';
import { FundSnapshot } from '../types';

interface FileUploadProps {
  onDataLoaded: (data: FundSnapshot) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const data = await parseExcelFile(file);
      if (data) {
        onDataLoaded(data);
        setSuccess(`Successfully imported ${data.fundName}`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError("Failed to parse Excel file. Please check format.");
    } finally {
      setIsProcessing(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="mb-8">
      <div 
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
          ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".xlsx,.xls,.csv"
          onChange={(e) => e.target.files && handleFile(e.target.files[0])}
        />
        
        <div className="flex flex-col items-center gap-3">
          <div className="bg-white p-3 rounded-full shadow-sm">
            {isProcessing ? (
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            ) : success ? (
              <CheckCircle className="text-green-500" size={32} />
            ) : error ? (
              <AlertCircle className="text-red-500" size={32} />
            ) : (
              <Upload className="text-indigo-600" size={32} />
            )}
          </div>
          
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-gray-900">
              {isProcessing ? 'Processing...' : 'Upload Portfolio Data'}
            </h3>
            <p className="text-xs text-gray-500">
              Drag & drop Excel file or click to browse
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      
      {success && (
        <div className="mt-3 p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2">
          <CheckCircle size={16} />
          {success}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
