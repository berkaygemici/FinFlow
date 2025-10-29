"use client";

import { useCallback, useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { pdfParser } from "@/lib/pdf-parser";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";

interface PDFUploadProps {
  onUploadComplete?: () => void;
}

export function PDFUpload({ onUploadComplete }: PDFUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    if (!file.type.includes("pdf")) {
      setUploadStatus("error");
      setErrorMessage("Please upload a PDF file");
      return;
    }

    setIsUploading(true);
    setUploadStatus("idle");
    setErrorMessage("");

    try {
      const statement = await pdfParser.parsePDF(file);
      await db.statements.add(statement);

      setUploadStatus("success");
      setTimeout(() => {
        setUploadStatus("idle");
        onUploadComplete?.();
      }, 2000);
    } catch (error) {
      console.error("Error parsing PDF:", error);
      setUploadStatus("error");
      setErrorMessage("Failed to parse PDF. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await processFile(files[0]);
      }
    },
    []
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <motion.div
          className={`
            relative border-2 border-dashed rounded-lg p-12 transition-colors
            ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
            ${isUploading ? "pointer-events-none opacity-60" : "cursor-pointer hover:border-primary hover:bg-primary/5"}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />

          <div className="flex flex-col items-center justify-center space-y-4">
            <AnimatePresence mode="wait">
              {isUploading ? (
                <motion.div
                  key="uploading"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center space-y-4"
                >
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Processing your bank statement...</p>
                </motion.div>
              ) : uploadStatus === "success" ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center space-y-4"
                >
                  <CheckCircle className="w-16 h-16 text-green-500" />
                  <p className="text-sm font-medium text-green-500">Upload successful!</p>
                </motion.div>
              ) : uploadStatus === "error" ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center space-y-4"
                >
                  <AlertCircle className="w-16 h-16 text-destructive" />
                  <p className="text-sm font-medium text-destructive">{errorMessage}</p>
                </motion.div>
              ) : (
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
                    <h3 className="text-lg font-semibold">Drop your bank statement here</h3>
                    <p className="text-sm text-muted-foreground">
                      or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports PDF files
                    </p>
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
