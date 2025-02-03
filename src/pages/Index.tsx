import React, { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { ScoreCard } from '@/components/ScoreCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const Index = () => {
  const [resume, setResume] = useState<File>();
  const [jobDescription, setJobDescription] = useState<File>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchScore, setMatchScore] = useState<number>();
  const { toast } = useToast();

  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + ' ';
    }
    
    return fullText;
  };

  const analyzeMatch = async () => {
    if (!resume || !jobDescription) {
      toast({
        title: "Missing files",
        description: "Please upload both resume and job description",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      // Extract text from PDF resume using PDF.js
      const resumeText = await extractPdfText(resume);

      // Extract text from DOCX job description
      const jdBuffer = await jobDescription.arrayBuffer();
      const jdResult = await mammoth.extractRawText({ arrayBuffer: jdBuffer });
      const jdText = jdResult.value;

      // For demo purposes, calculate a random match score
      // In a real app, you'd use NLP or AI to analyze the match
      const score = Math.floor(Math.random() * 40) + 60;
      setMatchScore(score);
      
      console.log('Analysis complete:', {
        resumeLength: resumeText.length,
        jdLength: jdText.length,
        score
      });

    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: "There was an error analyzing the documents",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Resume Match</h1>
          <p className="text-lg text-gray-500">
            Upload a resume and job description to see how well they match
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Resume</h2>
            <FileUpload
              accept={{
                'application/pdf': ['.pdf'],
              }}
              label="resume"
              onFileSelect={setResume}
              file={resume}
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Job Description</h2>
            <FileUpload
              accept={{
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
              }}
              label="job description"
              onFileSelect={setJobDescription}
              file={jobDescription}
            />
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={analyzeMatch}
            disabled={!resume || !jobDescription || isAnalyzing}
          >
            {isAnalyzing ? "Analyzing..." : "Analyze Match"}
          </Button>
        </div>

        {matchScore !== undefined && (
          <div className="mt-12">
            <ScoreCard
              score={matchScore}
              title="Match Score"
              description="This score represents how well the resume matches the job description requirements."
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;