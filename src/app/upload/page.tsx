'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (selectedFile: File | null) => {
    setError(null);
    setUploadedUrl(null);
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP, etc.)');
      return;
    }

    // Limit size to 10MB
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
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
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setUploadedUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(10); // Start progress indication

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate progress updates for smoother UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 15;
        });
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (response.ok && data.success) {
        setUploadedUrl(data.url);
        // Revoke preview to avoid memory leaks
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setFile(null);
      } else {
        setError(data.error || 'Failed to upload image. Please try again.');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError('An error occurred during upload. Please check your network.');
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = () => {
    if (!uploadedUrl) return;
    navigator.clipboard.writeText(uploadedUrl);
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
            Upload Image
          </h1>
          <p className="text-sm text-[#9E8E95] max-w-sm mx-auto font-light leading-relaxed">
            อัปโหลดไฟล์รูปภาพของคุณขึ้นระบบ Cloudflare R2 และบันทึกเข้าคลังภาพหน้าแรกโดยอัตโนมัติ
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[rgba(0,0,0,0.04)] shadow-[0_8px_30px_rgb(0,0,0,0.01)] backdrop-blur-sm">
          {/* DRAG AND DROP ZONE */}
          {!previewUrl && !uploadedUrl && (
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
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="hidden"
                accept="image/*"
              />
              
              <div className="w-14 h-14 rounded-full bg-[#FFF5F7] text-[#F4A0B5] flex items-center justify-center mb-4 border border-[rgba(244,160,181,0.15)] group-hover:scale-105 transition-transform duration-300">
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
                Drag & drop your photo here
              </p>
              <p className="text-xs text-[#9E8E95] font-light">
                or click to browse from device
              </p>
              <span className="inline-block mt-4 px-3 py-1 bg-[rgba(0,0,0,0.02)] text-[10px] text-[#9E8E95] rounded-full">
                Supports JPEG, PNG, WebP up to 10MB
              </span>
            </motion.div>
          )}

          {/* PREVIEW CONTAINER */}
          {previewUrl && file && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="relative rounded-2xl overflow-hidden border border-[rgba(0,0,0,0.06)] bg-neutral-50 flex items-center justify-center max-h-[300px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Upload Preview"
                  className="w-full h-full object-contain max-h-[300px]"
                />
                
                <button
                  onClick={handleRemove}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 text-[#3D3040] shadow-md flex items-center justify-center hover:bg-white hover:scale-105 transition-all duration-200 cursor-pointer"
                  title="Remove image"
                  disabled={isUploading}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Metadata Details */}
              <div className="flex items-center justify-between text-xs bg-[#FFFBFC] p-3 rounded-xl border border-[rgba(0,0,0,0.02)]">
                <div className="truncate max-w-[70%]">
                  <p className="font-semibold text-[#3D3040] truncate">{file.name}</p>
                  <p className="text-[#9E8E95] font-light">{formatBytes(file.size)}</p>
                </div>
                <span className="px-2 py-0.5 bg-[#FDDDE6] text-[#F4A0B5] font-bold rounded-md text-[10px] uppercase">
                  {file.type.split('/')[1] || 'image'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleRemove}
                  disabled={isUploading}
                  className="flex-1 py-3 px-4 rounded-xl border border-[rgba(0,0,0,0.08)] text-sm font-medium text-[#9E8E95] hover:text-[#3D3040] hover:bg-neutral-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex-2 py-3 px-4 rounded-xl bg-[#F4A0B5] hover:bg-[#F4A0B5]/90 text-white text-sm font-semibold shadow-[0_4px_12px_rgba(244,160,181,0.2)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Uploading ({uploadProgress}%)</span>
                    </>
                  ) : (
                    <span>Upload Image</span>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* SUCCESS SCREEN */}
          {uploadedUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-[#C5E8D8]/30 text-[#4EB886] flex items-center justify-center mx-auto border border-[rgba(78,184,134,0.15)] animate-bounce">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-8 h-8"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>

              <div>
                <h3 className="font-display text-xl font-bold text-[#3D3040] mb-1">
                  Upload Successful!
                </h3>
                <p className="text-xs text-[#9E8E95] font-light">
                  รูปภาพของคุณอัปโหลดขึ้น Cloudflare R2 และบันทึกข้อมูลเรียบร้อยแล้ว
                </p>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-[rgba(0,0,0,0.06)] bg-neutral-50 flex items-center justify-center max-h-[220px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadedUrl}
                  alt="Uploaded Photo"
                  className="w-full h-full object-contain max-h-[220px]"
                />
              </div>

              {/* URL Display and Copy Button */}
              <div className="space-y-2">
                <p className="text-left text-[11px] font-bold text-[#9E8E95] uppercase tracking-wider">
                  Public Image URL
                </p>
                <div className="flex gap-2 p-1.5 bg-[#FFFBFC] border border-[rgba(0,0,0,0.05)] rounded-xl items-center">
                  <input
                    type="text"
                    readOnly
                    value={uploadedUrl}
                    className="flex-1 bg-transparent px-3 py-1 text-xs text-[#3D3040] focus:outline-none select-all truncate"
                  />
                  <button
                    onClick={copyToClipboard}
                    className={`py-2 px-4 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                      copied
                        ? 'bg-[#C5E8D8] text-[#348861]'
                        : 'bg-[#F4A0B5] hover:bg-[#F4A0B5]/90 text-white'
                    }`}
                  >
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>

              {/* Back / Upload more actions */}
              <div className="flex gap-3 pt-2">
                <Link
                  href="/admin"
                  className="flex-1 py-3 px-4 rounded-xl border border-[rgba(0,0,0,0.08)] text-sm font-medium text-[#9E8E95] hover:text-[#3D3040] hover:bg-neutral-50 transition-all text-center flex items-center justify-center"
                >
                  View in Admin Panel
                </Link>
                <button
                  onClick={handleRemove}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#FFF0F3] hover:bg-[#FFF0F3]/80 text-[#F4A0B5] text-sm font-semibold border border-[rgba(244,160,181,0.15)] transition-all cursor-pointer"
                >
                  Upload Another
                </button>
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
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-1">
                      Upload Error
                    </h4>
                    <p className="text-xs font-light text-[#3D3040] leading-relaxed">{error}</p>
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
