'use client';

import { useState, useRef } from 'react';

export interface UploadFile {
  id: string;
  file: File;
  previewUrl: string;
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  uploadedUrl?: string;
  error?: string;
}

export function useUpload() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (selectedFiles: FileList | File[] | null) => {
    setError(null);
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newUploadFiles: UploadFile[] = [];
    const invalidFiles: string[] = [];

    Array.from(selectedFiles).forEach((selectedFile) => {
      if (!selectedFile.type.startsWith('image/')) {
        invalidFiles.push(`${selectedFile.name} (ไม่ใช่รูปภาพ)`);
        return;
      }

      if (selectedFile.size > 10 * 1024 * 1024) {
        invalidFiles.push(`${selectedFile.name} (ขนาดเกิน 10MB)`);
        return;
      }

      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const objectUrl = URL.createObjectURL(selectedFile);

      newUploadFiles.push({
        id,
        file: selectedFile,
        previewUrl: objectUrl,
        status: 'idle',
        progress: 0,
      });
    });

    if (invalidFiles.length > 0) {
      setError(`ข้ามบางไฟล์เนื่องจากไม่ตรงตามเงื่อนไข:\n${invalidFiles.join('\n')}`);
    }

    if (newUploadFiles.length > 0) {
      setFiles((prev) => [...prev, ...newUploadFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target && target.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleClearAll = () => {
    files.forEach((f) => {
      if (f.previewUrl) {
        URL.revokeObjectURL(f.previewUrl);
      }
    });
    setFiles([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    const filesToUpload = files.filter((f) => f.status === 'idle' || f.status === 'error');
    if (filesToUpload.length === 0) return;

    setIsUploading(true);
    setError(null);

    setFiles((prev) =>
      prev.map((f) =>
        f.status === 'idle' || f.status === 'error'
          ? { ...f, status: 'uploading', progress: 10, error: undefined }
          : f
      )
    );

    const uploadPromises = filesToUpload.map(async (uploadFile) => {
      let simulatedProgress = 10;
      const progressInterval = setInterval(() => {
        simulatedProgress = Math.min(simulatedProgress + 15, 90);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, progress: simulatedProgress } : f
          )
        );
      }, 200);

      const formData = new FormData();
      formData.append('file', uploadFile.file);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        clearInterval(progressInterval);

        const data = await response.json();

        if (response.ok && data.success) {
          if (uploadFile.previewUrl) {
            URL.revokeObjectURL(uploadFile.previewUrl);
          }

          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? { ...f, status: 'success', progress: 100, uploadedUrl: data.url }
                : f
            )
          );
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? { ...f, status: 'error', progress: 0, error: data.error || 'Failed to upload' }
                : f
            )
          );
        }
      } catch (err: any) {
        clearInterval(progressInterval);
        console.error('Upload error for file:', uploadFile.file.name, err);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: 'error', progress: 0, error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' }
              : f
          )
        );
      }
    });

    await Promise.all(uploadPromises);
    setIsUploading(false);
  };

  const copyToClipboard = (url: string, fileId: string) => {
    navigator.clipboard.writeText(url);
    setCopiedFileId(fileId);
    setTimeout(() => setCopiedFileId(null), 2000);
  };

  const copyAllLinks = () => {
    const urls = files
      .filter((f) => f.status === 'success' && f.uploadedUrl)
      .map((f) => f.uploadedUrl)
      .join('\n');

    if (!urls) return;
    navigator.clipboard.writeText(urls);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return {
    files,
    isDragging,
    isUploading,
    error,
    copied,
    copiedFileId,
    fileInputRef,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemoveFile,
    handleClearAll,
    handleUpload,
    copyToClipboard,
    copyAllLinks,
    formatBytes,
  };
}
