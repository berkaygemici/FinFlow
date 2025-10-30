"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Shield,
  Upload,
  TrendingUp,
  Repeat,
  Target,
  ArrowRight,
  Sparkles,
  Lock,
  Eye,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { generateSampleData } from "@/lib/sample-data";

interface OnboardingProps {
  onComplete: () => void;
}

const features = [
  {
    icon: Upload,
    title: "Upload & Analyze",
    description: "Import your bank statements and get instant insights into your spending patterns",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  {
    icon: Repeat,
    title: "Track Subscriptions",
    description: "Automatically detect recurring payments and subscriptions to stay on top of monthly costs",
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-500/10",
    iconColor: "text-purple-500",
  },
  {
    icon: TrendingUp,
    title: "Visualize Trends",
    description: "See your financial trends over time with beautiful charts and category breakdowns",
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-500/10",
    iconColor: "text-green-500",
  },
  {
    icon: Target,
    title: "Set Budgets",
    description: "Create budgets for different categories and get alerts when you're approaching limits",
    color: "from-orange-500 to-red-500",
    bgColor: "bg-orange-500/10",
    iconColor: "text-orange-500",
  },
];

const privacyFeatures = [
  {
    icon: Lock,
    title: "100% Local Storage",
    description: "All data stays on your device",
  },
  {
    icon: Eye,
    title: "No Tracking",
    description: "We don't see or collect your data",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Instant analysis, no server delays",
  },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<"welcome" | "features" | "data">("welcome");
  const [loading, setLoading] = useState(false);

  const handleLoadSampleData = async () => {
    setLoading(true);
    try {
      const sampleStatements = generateSampleData();

      // Add all sample statements to the database
      await db.statements.bulkAdd(sampleStatements);

      // Mark onboarding as completed and enable demo mode
      await db.settings.put({
        id: "default",
        aiCategorizationEnabled: true,
        onboardingCompleted: true,
        isDemoMode: true,
      });

      toast.success("Demo data loaded successfully", {
        description: "You can now explore all features with sample data.",
      });

      onComplete();
    } catch (error) {
      console.error("Error loading sample data:", error);
      toast.error("Failed to load sample data", {
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
      setLoading(false);
    }
  };

  const handleSkipToUpload = async () => {
    setLoading(true);
    try {
      // Mark onboarding as completed
      await db.settings.put({
        id: "default",
        aiCategorizationEnabled: true,
        onboardingCompleted: true,
      });

      toast.success("Welcome to your finance dashboard", {
        description: "You can now start uploading your bank statements.",
      });

      onComplete();
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast.error("Failed to complete onboarding", {
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {step === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-2xl w-full space-y-8 text-center"
            >
              {/* Hero Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="flex justify-center"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-2xl opacity-50 animate-pulse" />
                  <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 p-6 rounded-3xl">
                    <Shield className="w-16 h-16 text-white" />
                  </div>
                </div>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                  Welcome to Your Private Finance Dashboard
                </h1>
                <p className="text-xl text-muted-foreground max-w-xl mx-auto">
                  Take control of your finances with complete privacy and security
                </p>
              </motion.div>

              {/* Privacy Features */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="grid gap-4 md:grid-cols-3 mt-8"
              >
                {privacyFeatures.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <Card className="border-2 hover:border-primary/50 transition-colors">
                      <CardContent className="p-6 text-center space-y-3">
                        <div className="flex justify-center">
                          <div className="p-3 rounded-full bg-primary/10">
                            <feature.icon className="w-6 h-6 text-primary" />
                          </div>
                        </div>
                        <h3 className="font-semibold">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="pt-4"
              >
                <Button
                  size="lg"
                  onClick={() => setStep("features")}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-6 text-lg"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {step === "features" && (
            <motion.div
              key="features"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="max-w-4xl w-full space-y-8"
            >
              {/* Header */}
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="flex justify-center"
                >
                  <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                </motion.div>
                <h2 className="text-4xl font-bold">Powerful Features</h2>
                <p className="text-lg text-muted-foreground">
                  Everything you need to manage your finances effectively
                </p>
              </div>

              {/* Feature Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg h-full">
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${feature.bgColor} shrink-0`}>
                            <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-xl font-semibold">{feature.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Navigation */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center gap-4 pt-4"
              >
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setStep("welcome")}
                >
                  Back
                </Button>
                <Button
                  size="lg"
                  onClick={() => setStep("data")}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                >
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {step === "data" && (
            <motion.div
              key="data"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="max-w-3xl w-full space-y-8"
            >
              {/* Header */}
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="flex justify-center"
                >
                  <div className="p-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </div>
                </motion.div>
                <h2 className="text-4xl font-bold">Ready to Get Started?</h2>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                  Choose how you'd like to begin your financial journey
                </p>
              </div>

              {/* Options */}
              <div className="grid gap-6 md:grid-cols-2">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="border-2 hover:border-primary transition-all hover:shadow-xl cursor-pointer h-full group">
                    <CardContent className="p-8 space-y-6">
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 w-fit">
                          <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-2xl font-bold">Try Sample Data</h3>
                          <p className="text-muted-foreground">
                            Explore all features with realistic demo data before uploading your own statements
                          </p>
                        </div>
                      </div>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span>3 months of sample transactions</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span>Realistic spending patterns</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span>Test all features risk-free</span>
                        </li>
                      </ul>
                      <Button
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white group-hover:scale-105 transition-transform"
                        size="lg"
                        onClick={handleLoadSampleData}
                        disabled={loading}
                      >
                        {loading ? "Loading..." : "Load Sample Data"}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="border-2 hover:border-primary transition-all hover:shadow-xl cursor-pointer h-full group">
                    <CardContent className="p-8 space-y-6">
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 w-fit">
                          <Upload className="w-8 h-8 text-white" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-2xl font-bold">Upload My Data</h3>
                          <p className="text-muted-foreground">
                            Start analyzing your actual bank statements right away with complete privacy
                          </p>
                        </div>
                      </div>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span>100% local storage</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span>Instant analysis</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span>Your data never leaves your device</span>
                        </li>
                      </ul>
                      <Button
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white group-hover:scale-105 transition-transform"
                        size="lg"
                        onClick={handleSkipToUpload}
                        disabled={loading}
                      >
                        {loading ? "Proceeding..." : "Start Uploading"}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Back Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex justify-center pt-4"
              >
                <Button
                  variant="ghost"
                  onClick={() => setStep("features")}
                  disabled={loading}
                >
                  Back to Features
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
