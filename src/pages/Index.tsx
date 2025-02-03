import React, { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { ScoreCard } from '@/components/ScoreCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import stringSimilarity from 'string-similarity';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Define skill categories with weights
const skillCategories = {
  technical: {
    weight: 2.0,
    keywords: new Set([
      'python', 'javascript', 'typescript', 'java', 'c++', 'react', 'angular', 'vue',
      'node.js', 'express', 'django', 'flask', 'sql', 'mongodb', 'aws', 'docker',
      'kubernetes', 'ci/cd', 'git', 'rest', 'graphql', 'html', 'css'
    ])
  },
  soft: {
    weight: 1.5,
    keywords: new Set([
      'leadership', 'communication', 'teamwork', 'problem-solving', 'analytical',
      'project management', 'time management', 'collaboration', 'adaptability',
      'creativity', 'critical thinking'
    ])
  },
  industry: {
    weight: 1.8,
    keywords: new Set([
      'agile', 'scrum', 'kanban', 'sdlc', 'testing', 'debugging', 'optimization',
      'scalability', 'security', 'cloud', 'devops', 'full-stack', 'frontend',
      'backend', 'mobile', 'web development'
    ])
  }
};

const Index = () => {
  const [resume, setResume] = useState<File>();
  const [jobDescription, setJobDescription] = useState<File>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchScore, setMatchScore] = useState<number>();
  const [matchDetails, setMatchDetails] = useState<string[]>([]);
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

  // Function to extract key terms with categories
  const extractKeyTerms = (text: string) => {
    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, ' ');
    const words = cleanText.split(/\s+/);
    const terms: { [category: string]: Set<string> } = {
      technical: new Set(),
      soft: new Set(),
      industry: new Set(),
      other: new Set()
    };

    words.forEach(word => {
      if (word.length <= 2) return;

      // Check each category for the word
      for (const [category, data] of Object.entries(skillCategories)) {
        if (data.keywords.has(word)) {
          terms[category].add(word);
          return;
        }
      }

      // Check for fuzzy matches
      for (const [category, data] of Object.entries(skillCategories)) {
        for (const keyword of data.keywords) {
          if (stringSimilarity.compareTwoStrings(word, keyword) > 0.85) {
            terms[category].add(keyword);
            return;
          }
        }
      }

      // Add to other if no category match
      terms.other.add(word);
    });

    return terms;
  };

  // Function to calculate weighted match score
  const calculateMatchScore = (resumeTerms: { [category: string]: Set<string> }, 
                             jobTerms: { [category: string]: Set<string> }): [number, string[]] => {
    console.log('Analyzing match between resume and job description...');
    
    let totalScore = 0;
    let totalWeight = 0;
    const matchDetails: string[] = [];

    // Calculate score for each category
    for (const [category, data] of Object.entries(skillCategories)) {
      const categoryWeight = data.weight;
      const resumeCategoryTerms = Array.from(resumeTerms[category]);
      const jobCategoryTerms = Array.from(jobTerms[category]);

      let categoryMatches = 0;
      const matchedTerms: string[] = [];

      jobCategoryTerms.forEach(jobTerm => {
        const bestMatch = resumeCategoryTerms.find(resumeTerm => 
          stringSimilarity.compareTwoStrings(jobTerm, resumeTerm) > 0.85
        );
        if (bestMatch) {
          categoryMatches++;
          matchedTerms.push(jobTerm);
        }
      });

      if (jobCategoryTerms.length > 0) {
        const categoryScore = (categoryMatches / jobCategoryTerms.length) * categoryWeight;
        totalScore += categoryScore;
        totalWeight += categoryWeight;

        if (matchedTerms.length > 0) {
          matchDetails.push(`${category.charAt(0).toUpperCase() + category.slice(1)} skills matched: ${matchedTerms.join(', ')}`);
        }
      }
    }

    // Calculate final weighted score
    const finalScore = totalWeight > 0 
      ? Math.min(100, Math.max(40, Math.round((totalScore / totalWeight) * 100)))
      : 40;

    console.log('Category matches:', matchDetails);
    console.log('Final score:', finalScore);

    return [finalScore, matchDetails];
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
      const resumeText = await extractPdfText(resume);
      const jdBuffer = await jobDescription.arrayBuffer();
      const jdResult = await mammoth.extractRawText({ arrayBuffer: jdBuffer });
      const jdText = jdResult.value;

      const resumeTerms = extractKeyTerms(resumeText);
      const jobTerms = extractKeyTerms(jdText);

      const [score, details] = calculateMatchScore(resumeTerms, jobTerms);
      setMatchScore(score);
      setMatchDetails(details);
      
      console.log('Analysis complete:', {
        resumeTerms,
        jobTerms,
        score,
        details
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
          <div className="mt-12 space-y-6">
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