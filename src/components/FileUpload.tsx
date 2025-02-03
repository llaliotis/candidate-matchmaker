import React from 'react';
import { useDropzone } from 'react-dropzone';
import { File, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  accept: Record<string, string[]>;
  onFileSelect: (file: File) => void;
  label: string;
  file?: File;
}

export const FileUpload = ({ accept, onFileSelect, label, file }: FileUploadProps) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles?.[0]) {
        onFileSelect(acceptedFiles[0]);
      }
    },
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          'dropzone',
          isDragActive && 'dropzone-active'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <Upload className="h-8 w-8 text-gray-400" />
          <div className="space-y-2 text-center">
            <p className="text-sm text-gray-500">
              Drop your {label} here, or <span className="text-primary font-medium">browse</span>
            </p>
            <p className="text-xs text-gray-500">
              {accept[Object.keys(accept)[0]].join(', ')} files only
            </p>
          </div>
        </div>
      </div>
      
      {file && (
        <div className="file-preview flex items-center gap-2">
          <File className="h-4 w-4" />
          <span className="font-medium">{file.name}</span>
          <span className="text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
        </div>
      )}
    </div>
  );
};