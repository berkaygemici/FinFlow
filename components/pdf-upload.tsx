"use client";

import { useCallback, useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { pdfParser } from "@/lib/pdf-parser";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface PDFUploadProps {
  onUploadComplete?: () => void;
}

interface FileUploadStatus {
  file: File;
  status: "pending" | "reading" | "parsing" | "categorizing" | "saving" | "success" | "error";
  error?: string;
  progress: number;
}

export function PDFUpload({ onUploadComplete }: PDFUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<FileUploadStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const updateFileStatus = (index: number, updates: Partial<FileUploadStatus>) => {
    setFileStatuses((prev) =>
      prev.map((status, i) => (i === index ? { ...status, ...updates } : status))
    );
  };

  const processFile = async (file: File, index: number) => {
    if (!file.type.includes("pdf")) {
      updateFileStatus(index, {
        status: "error",
        error: "Not a PDF file",
        progress: 0,
      });
      return;
    }

    try {
      // Step 1: Reading file
      updateFileStatus(index, { status: "reading", progress: 20 });
      await new Promise((resolve) => setTimeout(resolve, 300)); // Small delay for animation

      // Step 2: Parsing PDF
      updateFileStatus(index, { status: "parsing", progress: 40 });
      const statement = await pdfParser.parsePDF(file);

      // Step 3: Categorizing transactions
      updateFileStatus(index, { status: "categorizing", progress: 70 });
      await new Promise((resolve) => setTimeout(resolve, 200)); // Small delay for animation

      // Step 4: Saving to database
      updateFileStatus(index, { status: "saving", progress: 90 });
      await db.statements.add(statement);

      // Step 5: Success
      updateFileStatus(index, { status: "success", progress: 100 });
    } catch (error) {
      console.error("Error parsing PDF:", error);
      updateFileStatus(index, {
        status: "error",
        error: error instanceof Error ? error.message : "Failed to parse PDF",
        progress: 0,
      });
    }
  };

  const processFiles = async (files: File[]) => {
    setIsProcessing(true);

    // Initialize file statuses
    const initialStatuses: FileUploadStatus[] = files.map((file) => ({
      file,
      status: "pending",
      progress: 0,
    }));
    setFileStatuses(initialStatuses);

    // Process all files
    await Promise.all(
      files.map((file, index) => processFile(file, index))
    );

    // Wait a bit to show the final state
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Check if all succeeded
    const allSucceeded = initialStatuses.every(
      (_, index) => fileStatuses[index]?.status === "success"
    );

    setIsProcessing(false);

    // Call completion callback after a short delay
    if (allSucceeded || fileStatuses.some((s) => s.status === "success")) {
      setTimeout(() => {
        onUploadComplete?.();
      }, 1000);
    }
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.includes("pdf")
      );
      if (files.length > 0) {
        await processFiles(files);
      }
    },
    []
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFiles(Array.from(files));
    }
  };

  const getStatusText = (status: FileUploadStatus["status"]) => {
    switch (status) {
      case "pending":
        return "Waiting...";
      case "reading":
        return "Reading file...";
      case "parsing":
        return "Extracting transactions...";
      case "categorizing":
        return "Categorizing...";
      case "saving":
        return "Saving to database...";
      case "success":
        return "Upload complete!";
      case "error":
        return "Failed";
      default:
        return "";
    }
  };

  const getStatusIcon = (status: FileUploadStatus["status"]) => {
    switch (status) {
      case "pending":
        return <FileText className="w-5 h-5 text-muted-foreground" />;
      case "reading":
      case "parsing":
      case "categorizing":
      case "saving":
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <motion.div
          className={`
            relative border-2 border-dashed rounded-lg transition-colors
            ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
            ${isProcessing ? "pointer-events-none" : "cursor-pointer hover:border-primary hover:bg-primary/5"}
            ${fileStatuses.length > 0 ? "p-6" : "p-12"}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          whileHover={!isProcessing ? { scale: 1.01 } : {}}
          whileTap={!isProcessing ? { scale: 0.99 } : {}}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isProcessing}
            multiple
          />

          <div className="flex flex-col items-center justify-center space-y-4">
            <AnimatePresence mode="wait">
              {fileStatuses.length === 0 ? (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center space-y-4"
                >
                  <div className="relative">
                    <Upload className="w-16 h-16 text-muted-foreground" />
                    <motion.div
                      className="absolute -top-2 -right-2"
                      animate={{
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <FileText className="w-6 h-6 text-primary" />
                    </motion.div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">Drop your bank statements here</h3>
                    <p className="text-sm text-muted-foreground">
                      or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports multiple PDF files • Drag and drop
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full space-y-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">
                      Processing {fileStatuses.length} file{fileStatuses.length > 1 ? "s" : ""}
                    </h3>
                    <div className="text-sm text-muted-foreground">
                      {fileStatuses.filter((s) => s.status === "success").length}/
                      {fileStatuses.length} completed
                    </div>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {fileStatuses.map((fileStatus, index) => (
                      <motion.div
                        key={`${fileStatus.file.name}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`
                          p-4 rounded-lg border-2 transition-all
                          ${
                            fileStatus.status === "success"
                              ? "border-green-500/30 bg-green-500/5"
                              : fileStatus.status === "error"
                              ? "border-destructive/30 bg-destructive/5"
                              : "border-primary/30 bg-primary/5"
                          }
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">{getStatusIcon(fileStatus.status)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <p className="font-medium text-sm truncate">
                                {fileStatus.file.name}
                              </p>
                              <span
                                className={`text-xs font-medium ${
                                  fileStatus.status === "success"
                                    ? "text-green-500"
                                    : fileStatus.status === "error"
                                    ? "text-destructive"
                                    : "text-primary"
                                }`}
                              >
                                {getStatusText(fileStatus.status)}
                              </span>
                            </div>

                            {fileStatus.status !== "error" && fileStatus.status !== "success" && (
                              <div className="space-y-1">
                                <Progress value={fileStatus.progress} className="h-2" />
                                <p className="text-xs text-muted-foreground">
                                  {fileStatus.progress}%
                                </p>
                              </div>
                            )}

                            {fileStatus.error && (
                              <p className="text-xs text-destructive mt-1">{fileStatus.error}</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
