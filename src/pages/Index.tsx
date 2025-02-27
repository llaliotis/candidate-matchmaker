import React, { useState, useRef, useEffect } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { ScoreCard } from '@/components/ScoreCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { Download } from 'lucide-react';
import { jsPDF } from "jspdf";
import 'jspdf-autotable';

// Initialize PDF.js worker with a specific version
const PDFJS_VERSION = '3.11.174';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

const Index = () => {
  const [resume, setResume] = useState<File>();
  const [jobDescription, setJobDescription] = useState<File>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchScore, setMatchScore] = useState<number>();
  const [matchDetails, setMatchDetails] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState('');
  const { toast } = useToast();
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (matchScore !== undefined && resultsRef.current) {
      resultsRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [matchScore]);

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

  const analyzeWithGPT = async (resumeText: string, jobText: string) => {
    console.log('Sending analysis request to OpenAI...');
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert recruiter analyzing resume matches. Provide a match percentage and detailed analysis.'
            },
            {
              role: 'user',
              content: `Please analyze this resume against the job description. 
                       Provide a match percentage and list specific matching skills and qualifications.
                       Resume: ${resumeText}
                       Job Description: ${jobText}`
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get analysis from OpenAI');
      }

      const result = await response.json();
      console.log('OpenAI response:', result);

      // Extract percentage from the response
      const content = result.choices[0].message.content;
      const percentageMatch = content.match(/(\d+)%/);
      const score = percentageMatch ? parseInt(percentageMatch[1]) : 50;

      // Extract key points as match details
      const details = content
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.trim());

      return { score, details };
    } catch (error) {
      console.error('OpenAI analysis error:', error);
      throw error;
    }
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

    if (!apiKey) {
      toast({
        title: "Missing API Key",
        description: "Please enter your OpenAI API key",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const resumeText = await extractPdfText(resume);
      const jdBuffer = await jobDescription.arrayBuffer();
      const jdResult = await mammoth.extractRawText({ arrayBuffer: jdBuffer });
      const jdText = jdResult.value;

      const analysis = await analyzeWithGPT(resumeText, jdText);
      setMatchScore(analysis.score);
      setMatchDetails(analysis.details);
      
      console.log('Analysis complete:', {
        score: analysis.score,
        details: analysis.details
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

  const generatePdfReport = () => {
    if (matchScore === undefined || matchDetails.length === 0) {
      toast({
        title: "No analysis results",
        description: "Please analyze the documents first",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Resume Match Analysis Report', pageWidth / 2, 20, { align: 'center' });
    
    // Add date
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });
    
    // Add match score
    doc.setFontSize(16);
    doc.text('Match Score:', 20, 50);
    doc.setFont(undefined, 'bold');
    doc.text(`${matchScore}%`, 80, 50);
    doc.setFont(undefined, 'normal');
    
    // Add match details
    doc.setFontSize(16);
    doc.text('Match Details:', 20, 70);
    doc.setFontSize(12);
    
    const splitDetails = doc.splitTextToSize(matchDetails.join('\n\n'), pageWidth - 40);
    doc.text(splitDetails, 20, 80);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `resume-match-analysis-${timestamp}.pdf`;
    
    // Save the PDF
    doc.save(filename);
    
    toast({
      title: "Report downloaded",
      description: "Your analysis report has been saved as a PDF",
    });
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

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="apiKey" className="text-sm font-medium text-gray-700">
              OpenAI API Key
            </label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OpenAI API key"
              className="w-full"
            />
          </div>
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
            disabled={!resume || !jobDescription || !apiKey || isAnalyzing}
          >
            {isAnalyzing ? "Analyzing..." : "Analyze Match"}
          </Button>
        </div>

        {matchScore !== undefined && (
          <div ref={resultsRef} className="mt-12 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Analysis Results</h2>
              <Button
                onClick={generatePdfReport}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Report
              </Button>
            </div>
            
            <ScoreCard
              score={matchScore}
              title="Match Score"
              description="This score represents how well the resume matches the job description requirements."
            />
            {matchDetails.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Match Details</h3>
                <ul className="space-y-2 text-left">
                  {matchDetails.map((detail, index) => (
                    <li key={index} className="text-gray-700">{detail}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;