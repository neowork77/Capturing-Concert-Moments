'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadFile {
  id: string;
  file: File;
  previewUrl: string;
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  uploadedUrl?: string;
  error?: string;
}

export default function UploadPage() {
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

      // Limit size to 10MB
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

    // Initialize progress indicators for files being uploaded
    setFiles((prev) =>
      prev.map((f) =>
        f.status === 'idle' || f.status === 'error'
          ? { ...f, status: 'uploading', progress: 10, error: undefined }
          : f
      )
    );

    const uploadPromises = filesToUpload.map(async (uploadFile) => {
      // Simulate progress for smoother UX
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
          // Revoke object URL to avoid memory leaks after successful upload
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

  // Helper to format file size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const hasUploadFinished = files.length > 0 && files.every((f) => f.status === 'success' || f.status === 'error');
  const allSuccess = files.length > 0 && files.every((f) => f.status === 'success');
  const hasSuccesses = files.some((f) => f.status === 'success');

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 bg-[#FFFBFC] text-[#3D3040] flex flex-col justify-between">
      <div className="max-w-xl w-full mx-auto">
        {/* Navigation back */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#9E8E95] hover:text-[#F4A0B5] transition-all duration-300 group"
          >
            <span className="text-sm transform group-hover:-translate-x-1 transition-transform">‹</span> Back to Admin Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-[#F4A0B5] mb-3">
            ✦ Studio Upload
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-[#3D3040] mb-3">
            Upload Images
          </h1>
          <p className="text-sm text-[#9E8E95] max-w-sm mx-auto font-light leading-relaxed">
            อัปโหลดไฟล์รูปภาพของคุณขึ้นระบบ Cloudflare R2 และบันทึกเข้าคลังภาพหน้าแรกโดยอัตโนมัติ
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[rgba(0,0,0,0.04)] shadow-[0_8px_30px_rgb(0,0,0,0.01)] backdrop-blur-sm">
          {/* DRAG AND DROP ZONE */}
          {files.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[260px] ${
                isDragging
                  ? 'border-[#F4A0B5] bg-[#FFF5F7]'
                  : 'border-[rgba(0,0,0,0.08)] hover:border-[#F4A0B5]/40 hover:bg-[#FFF5F7]/30'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                multiple
                onChange={(e) => handleFileChange(e.target.files)}
                className="hidden"
                accept="image/*"
              />

              <div className="w-14 h-14 rounded-full bg-[#FFF5F7] text-[#F4A0B5] flex items-center justify-center mb-4 border border-[rgba(244,160,181,0.15)] transition-transform duration-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.9 2.9m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
              </div>

              <p className="text-sm font-semibold text-[#3D3040] mb-1">
                Drag & drop your photos here
              </p>
              <p className="text-xs text-[#9E8E95] font-light">
                or click to browse from device (supports multiple files)
              </p>
              <span className="inline-block mt-4 px-3 py-1 bg-[rgba(0,0,0,0.02)] text-[10px] text-[#9E8E95] rounded-full">
                Supports JPEG, PNG, WebP up to 10MB each
              </span>
            </motion.div>
          )}

          {/* MAIN WORKSPACE: PREVIEW & CONTROLS */}
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {/* Summary Header */}
              <div className="flex items-center justify-between text-xs bg-[#FFFBFC] p-4 rounded-2xl border border-[rgba(0,0,0,0.02)]">
                <div>
                  <p className="font-semibold text-[#3D3040]">
                    เลือกทั้งหมด {files.length} {files.length === 1 ? 'รูปภาพ' : 'รูปภาพ'}
                  </p>
                  <p className="text-[#9E8E95] font-light">
                    ขนาดรวม: {formatBytes(files.reduce((acc, f) => acc + f.file.size, 0))}
                  </p>
                </div>

                {/* Upload status counts */}
                <div className="flex gap-1.5">
                  {files.some((f) => f.status === 'success') && (
                    <span className="px-2 py-0.5 bg-[#C5E8D8] text-[#348861] font-bold rounded-md text-[10px] uppercase">
                      สำเร็จ: {files.filter((f) => f.status === 'success').length}
                    </span>
                  )}
                  {files.some((f) => f.status === 'error') && (
                    <span className="px-2 py-0.5 bg-[#FFF0F3] text-[#F4A0B5] font-bold rounded-md text-[10px] uppercase">
                      ล้มเหลว: {files.filter((f) => f.status === 'error').length}
                    </span>
                  )}
                </div>
              </div>

              {/* Grid of File Cards */}
              <div className="grid grid-cols-1 gap-3 max-h-[360px] overflow-y-auto pr-1">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="relative bg-[#FFFBFC] border border-[rgba(0,0,0,0.05)] rounded-2xl p-3 flex gap-3 items-center group transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:border-[#F4A0B5]/20"
                  >
                    {/* Image Thumbnail */}
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-neutral-50 flex-shrink-0 flex items-center justify-center border border-[rgba(0,0,0,0.04)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={file.previewUrl || file.uploadedUrl}
                        alt={file.file.name}
                        className="w-full h-full object-cover"
                      />

                      {/* Uploading Spinner Overlay */}
                      {file.status === 'uploading' && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                      )}

                      {/* Success Check Overlay */}
                      {file.status === 'success' && (
                        <div className="absolute inset-0 bg-[#4EB886]/80 flex items-center justify-center text-white">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={3}
                            stroke="currentColor"
                            className="w-5 h-5"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        </div>
                      )}

                      {/* Error Alert Overlay */}
                      {file.status === 'error' && (
                        <div className="absolute inset-0 bg-[#F4A0B5]/80 flex items-center justify-center text-white">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={3}
                            stroke="currentColor"
                            className="w-5 h-5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008h-.008v-.008z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 pr-6 relative">
                      <p className="text-xs font-semibold text-[#3D3040] truncate" title={file.file.name}>
                        {file.file.name}
                      </p>
                      <p className="text-[10px] text-[#9E8E95] font-light">{formatBytes(file.file.size)}</p>

                      {/* Uploading progress bar */}
                      {file.status === 'uploading' && (
                        <div className="w-full bg-neutral-100 h-1 rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-[#F4A0B5] h-full transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      )}

                      {/* Success state - Copy individual link */}
                      {file.status === 'success' && file.uploadedUrl && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <button
                            onClick={() => copyToClipboard(file.uploadedUrl!, file.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors duration-150 flex items-center gap-1 cursor-pointer ${
                              copiedFileId === file.id
                                ? 'bg-[#C5E8D8] text-[#348861]'
                                : 'bg-[#FFF0F3] hover:bg-[#FFF0F3]/80 text-[#F4A0B5]'
                            }`}
                          >
                            {copiedFileId === file.id ? 'Copied!' : 'Copy Link'}
                          </button>
                          <a
                            href={file.uploadedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-[#9E8E95] hover:text-[#3D3040] underline font-light"
                          >
                            View Image
                          </a>
                        </div>
                      )}

                      {/* Error message */}
                      {file.status === 'error' && (
                        <p className="text-[10px] text-[#F4A0B5] font-medium mt-1 truncate" title={file.error}>
                          {file.error || 'Upload failed'}
                        </p>
                      )}
                    </div>

                    {/* Remove / Delete Button (Only visible if not uploading) */}
                    {!isUploading && file.status !== 'success' && (
                      <button
                        onClick={() => handleRemoveFile(file.id)}
                        className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-neutral-50 hover:bg-neutral-100 text-[#9E8E95] hover:text-[#3D3040] flex items-center justify-center transition-colors cursor-pointer border border-[rgba(0,0,0,0.02)]"
                        title="Remove file"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-3.5 h-3.5"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* SUCCESS SUMMARY CARD */}
              {hasUploadFinished && allSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-[#C5E8D8]/20 border border-[rgba(78,184,134,0.15)] rounded-2xl p-4 text-center"
                >
                  <p className="text-sm font-semibold text-[#348861] mb-1">✓ อัปโหลดรูปภาพทั้งหมดสำเร็จเรียบร้อยแล้ว!</p>
                  <p className="text-xs text-[#9E8E95] font-light mb-3">รูปภาพของคุณอยู่ในระบบคลาวด์ R2 และฐานข้อมูลพร้อมใช้งานในแกลเลอรี</p>
                  <button
                    onClick={copyAllLinks}
                    className={`py-2 px-4 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                      copied
                        ? 'bg-[#C5E8D8] text-[#348861]'
                        : 'bg-[#F4A0B5] hover:bg-[#F4A0B5]/90 text-white'
                    }`}
                  >
                    {copied ? 'Copied all links!' : 'Copy All Links'}
                  </button>
                </motion.div>
              )}

              {/* PARTIAL ERROR SUMMARY CARD */}
              {hasUploadFinished && !allSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-[#FFF0F3] border border-[rgba(244,160,181,0.2)] rounded-2xl p-4"
                >
                  <p className="text-sm font-bold text-[#F4A0B5] mb-1">⚠ การอัปโหลดเสร็จสิ้นแต่พบบางส่วนมีข้อผิดพลาด</p>
                  <p className="text-xs text-[#3D3040] font-light leading-relaxed mb-3">
                    มีบางไฟล์ที่ไม่สามารถอัปโหลดได้ คุณสามารถกดลองอีกครั้ง (Retry Failed) หรือลบไฟล์ดังกล่าวออกจากรายการ
                  </p>
                  <div className="flex gap-2">
                    {hasSuccesses && (
                      <button
                        onClick={copyAllLinks}
                        className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                          copied
                            ? 'bg-[#C5E8D8] text-[#348861]'
                            : 'bg-[#F4A0B5]/10 text-[#F4A0B5] hover:bg-[#F4A0B5]/20 border border-[rgba(244,160,181,0.15)]'
                        }`}
                      >
                        {copied ? 'Copied!' : 'Copy Successful Links'}
                      </button>
                    )}
                    <button
                      onClick={handleUpload}
                      className="flex-1 py-2 px-3 bg-[#F4A0B5] hover:bg-[#F4A0B5]/90 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
                    >
                      Retry Failed
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ACTION FOOTER */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleClearAll}
                  disabled={isUploading}
                  className="flex-1 py-3 px-4 rounded-xl border border-[rgba(0,0,0,0.08)] text-sm font-medium text-[#9E8E95] hover:text-[#3D3040] hover:bg-neutral-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {hasUploadFinished ? 'Clear & Start New' : 'Cancel'}
                </button>

                {!hasUploadFinished && (
                  <>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex-1 py-3 px-4 rounded-xl border border-[rgba(244,160,181,0.15)] bg-[#FFF0F3] hover:bg-[#FFF0F3]/80 text-[#F4A0B5] text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add More
                    </button>
                    <button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="flex-2 py-3 px-4 rounded-xl bg-[#F4A0B5] hover:bg-[#F4A0B5]/90 text-white text-sm font-semibold shadow-[0_4px_12px_rgba(244,160,181,0.2)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isUploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <span>Upload {files.filter((f) => f.status === 'idle' || f.status === 'error').length} Photos</span>
                      )}
                    </button>
                  </>
                )}

                {hasUploadFinished && (
                  <Link
                    href="/admin"
                    className="flex-1 py-3 px-4 rounded-xl bg-[#F4A0B5] hover:bg-[#F4A0B5]/90 text-white text-sm font-semibold text-center flex items-center justify-center shadow-[0_4px_12px_rgba(244,160,181,0.15)]"
                  >
                    View in Admin Panel
                  </Link>
                )}
              </div>
            </motion.div>
          )}

          {/* ERROR STATUS */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 overflow-hidden"
              >
                <div className="flex items-start gap-3 p-4 bg-[#FFF0F3] border border-[rgba(244,160,181,0.2)] rounded-xl text-[#F4A0B5]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008h-.008v-.008z"
                    />
                  </svg>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-1">Upload Notice</h4>
                    <p className="text-xs font-light text-[#3D3040] leading-relaxed whitespace-pre-line">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer signoff */}
      <div className="text-center text-[10px] text-[#C8BBC0] mt-12 font-light">
        PicHaus Uploader System &copy; {new Date().getFullYear()} watashiwajp. All rights reserved.
      </div>
    </div>
  );
}
