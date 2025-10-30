"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PDFUpload } from "@/components/pdf-upload";
import { FileText } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();

  const handleUploadComplete = () => {
    setTimeout(() => {
      router.push("/dashboard");
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold">Upload Bank Statements</h1>
        <p className="text-muted-foreground mt-2">
          Upload one or multiple PDF bank statements to analyze your finances
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <PDFUpload onUploadComplete={handleUploadComplete} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-muted/50 rounded-lg p-6 space-y-3"
      >
        <h3 className="font-semibold">How it works:</h3>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>Drag and drop one or multiple PDF bank statements or click to browse</li>
          <li>Watch real-time progress as each file is processed simultaneously</li>
          <li>The app will automatically parse and categorize your transactions</li>
          <li>View your financial insights in the dashboard</li>
        </ol>
      </motion.div>
    </div>
  );
}
