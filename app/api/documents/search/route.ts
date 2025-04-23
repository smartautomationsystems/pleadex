import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/libs/auth';
import { connectToDatabase } from '@/libs/db';
import { ObjectId } from 'mongodb';
import OpenAI from 'openai';

interface SearchResult {
  id: string;
  text: string;
  context: string;
  relevance: number;
  section?: string;
  metadata?: {
    caseNumber?: string;
    date?: string;
    documentType?: string;
    parties?: string[];
    court?: string;
    judge?: string;
    attorneys?: string[];
    citations?: string[];
    timeline?: {
      filingDate?: string;
      hearingDate?: string;
      deadline?: string;
    };
    arguments?: {
      claims?: string[];
      counterArguments?: string[];
      evidence?: string[];
      authorities?: string[];
    };
  };
}

interface Document {
  id: string;
  content: string | null;
  type?: string;
  uploadedAt?: string;
}

interface ChunkResult {
  text: string;
  relevance: number;
  section?: string;
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Legal document section detection
const LEGAL_SECTIONS = [
  'FACTS',
  'ARGUMENTS',
  'EVIDENCE',
  'CONCLUSION',
  'RELIEF SOUGHT',
  'DECLARATION',
  'ATTACHMENT',
  'EXHIBIT'
];

// Document type classification
const DOCUMENT_TYPES = [
  // Pleadings
  'COMPLAINT',
  'ANSWER',
  'CROSS-COMPLAINT',
  'REPLY',
  'AMENDED COMPLAINT',
  'AMENDED ANSWER',
  
  // Motions
  'MOTION',
  'MOTION TO DISMISS',
  'MOTION FOR SUMMARY JUDGMENT',
  'MOTION TO COMPEL',
  'MOTION TO QUASH',
  'MOTION TO STRIKE',
  'MOTION IN LIMINE',
  
  // Orders
  'ORDER',
  'JUDGMENT',
  'DECREE',
  'RULING',
  'MINUTE ORDER',
  
  // Discovery
  'INTERROGATORIES',
  'REQUEST FOR ADMISSIONS',
  'REQUEST FOR PRODUCTION',
  'DEPOSITION',
  'SUBPOENA',
  
  // Briefs
  'BRIEF',
  'MEMORANDUM OF POINTS AND AUTHORITIES',
  'OPPOSITION',
  'REPLY BRIEF',
  'AMICUS BRIEF',
  
  // Notices
  'NOTICE',
  'NOTICE OF HEARING',
  'NOTICE OF APPEAL',
  'NOTICE OF DEPOSITION',
  'NOTICE OF MOTION',
  
  // Declarations and Affidavits
  'DECLARATION',
  'AFFIDAVIT',
  'VERIFICATION',
  
  // Evidence
  'EXHIBIT',
  'ATTACHMENT',
  'EVIDENCE',
  
  // Other
  'PETITION',
  'APPLICATION',
  'STIPULATION',
  'SETTLEMENT AGREEMENT',
  'RELEASE',
  'WAIVER'
];

// Court types
const COURT_TYPES = [
  // Federal Courts
  'UNITED STATES SUPREME COURT',
  'UNITED STATES COURT OF APPEALS',
  'UNITED STATES DISTRICT COURT',
  'UNITED STATES BANKRUPTCY COURT',
  'UNITED STATES TAX COURT',
  'UNITED STATES COURT OF FEDERAL CLAIMS',
  'UNITED STATES COURT OF INTERNATIONAL TRADE',
  
  // State Courts
  'SUPREME COURT',
  'COURT OF APPEAL',
  'SUPERIOR COURT',
  'DISTRICT COURT',
  'MUNICIPAL COURT',
  'JUSTICE COURT',
  'SMALL CLAIMS COURT',
  
  // Specialized Courts
  'FAMILY COURT',
  'PROBATE COURT',
  'JUVENILE COURT',
  'TRAFFIC COURT',
  'HOUSING COURT',
  'DRUG COURT',
  'VETERANS COURT',
  
  // Administrative Courts
  'ADMINISTRATIVE LAW COURT',
  'WORKERS COMPENSATION COURT',
  'TAX COURT',
  'ENVIRONMENTAL COURT',
  
  // Tribal Courts
  'TRIBAL COURT',
  'NATIVE AMERICAN COURT'
];

function detectSection(text: string): string | undefined {
  const upperText = text.toUpperCase();
  for (const section of LEGAL_SECTIONS) {
    if (upperText.includes(section)) {
      return section;
    }
  }
  return undefined;
}

function detectDocumentType(text: string): string | undefined {
  const upperText = text.toUpperCase();
  for (const type of DOCUMENT_TYPES) {
    if (upperText.includes(type)) {
      return type;
    }
  }
  return undefined;
}

function detectCourt(text: string): string | undefined {
  const upperText = text.toUpperCase();
  for (const court of COURT_TYPES) {
    if (upperText.includes(court)) {
      return court;
    }
  }
  return undefined;
}

// Case citation detection with validation
function extractCaseCitations(text: string): string[] {
  const citationRegex = /(\d{1,3}\s+Cal\.App\.\d{1,3}d\s+\d{1,3})/g;
  const citations = text.match(citationRegex) || [];
  return citations.filter(citation => {
    // Basic validation of citation format
    const parts = citation.split(/\s+/);
    return parts.length >= 3 && 
           !isNaN(parseInt(parts[0])) && 
           parts[1].includes('Cal.App.') &&
           !isNaN(parseInt(parts[2]));
  });
}

// Date detection with context
function extractDates(text: string): { date: string; context: string }[] {
  const dateRegex = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,\s+\d{4}/g;
  const dates: { date: string; context: string }[] = [];
  let match;
  
  while ((match = dateRegex.exec(text)) !== null) {
    const start = Math.max(0, match.index - 50);
    const end = Math.min(text.length, match.index + match[0].length + 50);
    const context = text.slice(start, end);
    dates.push({ date: match[0], context });
  }
  
  return dates;
}

// Party and role detection
function extractParties(text: string): { name: string; role: string }[] {
  const partyRegex = /(?:Petitioner|Respondent|Plaintiff|Defendant|Appellant|Appellee)(?:\s+[A-Z][a-z]+)+/g;
  const parties: { name: string; role: string }[] = [];
  let match;
  
  while ((match = partyRegex.exec(text)) !== null) {
    const role = match[0].split(/\s+/)[0];
    const name = match[0].split(/\s+/).slice(1).join(' ');
    parties.push({ name, role });
  }
  
  return parties;
}

// Judge name detection
function extractJudge(text: string): string | undefined {
  const judgeRegex = /(?:Honorable|Judge)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g;
  const match = text.match(judgeRegex);
  return match ? match[0] : undefined;
}

// Attorney detection
function extractAttorneys(text: string): string[] {
  const attorneyRegex = /(?:Attorney|Counsel|Lawyer)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g;
  return text.match(attorneyRegex) || [];
}

// Argument structure detection
function extractArguments(text: string): { claims: string[]; counterArguments: string[]; evidence: string[]; authorities: string[] } {
  const claims: string[] = [];
  const counterArguments: string[] = [];
  const evidence: string[] = [];
  const authorities: string[] = [];
  
  // Split by paragraphs
  const paragraphs = text.split(/\n\s*\n/);
  
  for (const paragraph of paragraphs) {
    const upperPara = paragraph.toUpperCase();
    
    if (upperPara.includes('CLAIM') || upperPara.includes('ARGUMENT')) {
      claims.push(paragraph);
    } else if (upperPara.includes('COUNTER') || upperPara.includes('OPPOSE')) {
      counterArguments.push(paragraph);
    } else if (upperPara.includes('EVIDENCE') || upperPara.includes('EXHIBIT')) {
      evidence.push(paragraph);
    } else if (upperPara.includes('AUTHORITY') || upperPara.includes('CITE')) {
      authorities.push(paragraph);
    }
  }
  
  return { claims, counterArguments, evidence, authorities };
}

// Semantic chunking with legal context
function semanticChunkText(text: string): string[] {
  // Split by double newlines first (paragraphs)
  const paragraphs = text.split(/\n\s*\n/);
  
  // Further split by section headers
  const chunks: string[] = [];
  let currentSection = '';
  
  for (const paragraph of paragraphs) {
    const section = detectSection(paragraph);
    if (section) {
      currentSection = section;
    }
    
    // Add section header to chunk
    const chunk = currentSection ? `${currentSection}:\n${paragraph}` : paragraph;
    chunks.push(chunk);
  }
  
  return chunks;
}

async function getEmbedding(text: string): Promise<number[]> {
  // Truncate text to stay within token limits
  const maxTokens = 8000; // Leave some buffer
  const truncatedText = text.slice(0, maxTokens * 4); // Rough estimate: 4 chars per token
  
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: truncatedText,
  });
  return response.data[0].embedding;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

async function findBestChunk(chunks: string[], queryEmbedding: number[]): Promise<ChunkResult> {
  let bestChunk: ChunkResult = { text: '', relevance: 0, section: undefined };
  
  for (const chunk of chunks) {
    const chunkEmbedding = await getEmbedding(chunk);
    const chunkRelevance = cosineSimilarity(queryEmbedding, chunkEmbedding);
    if (chunkRelevance > bestChunk.relevance) {
      const section = detectSection(chunk);
      bestChunk = { text: chunk, relevance: chunkRelevance, section };
    }
  }
  
  return bestChunk;
}

async function performAISearch(query: string, documents: Document[]): Promise<SearchResult[]> {
  const queryEmbedding = await getEmbedding(query);
  
  const results = await Promise.all(
    documents.map(async (doc) => {
      if (!doc.content) return null;
      
      const docEmbedding = await getEmbedding(doc.content);
      const relevance = cosineSimilarity(queryEmbedding, docEmbedding);
      
      const chunks = semanticChunkText(doc.content);
      const bestChunk = await findBestChunk(chunks, queryEmbedding);
      
      // Extract all metadata
      const dates = extractDates(doc.content);
      const parties = extractParties(doc.content);
      const citations = extractCaseCitations(doc.content);
      const judge = extractJudge(doc.content);
      const attorneys = extractAttorneys(doc.content);
      const arguments = extractArguments(doc.content);
      
      const metadata = {
        caseNumber: citations[0],
        date: dates[0]?.date,
        documentType: detectDocumentType(doc.content) || doc.type,
        parties: parties.map(p => `${p.role}: ${p.name}`),
        court: detectCourt(doc.content),
        judge,
        attorneys,
        citations,
        timeline: {
          filingDate: dates.find(d => d.context.includes('FILE'))?.date,
          hearingDate: dates.find(d => d.context.includes('HEAR'))?.date,
          deadline: dates.find(d => d.context.includes('DEADLINE'))?.date
        },
        arguments
      };
  
  return {
        id: doc.id,
        text: bestChunk.text,
        context: bestChunk.text,
        relevance,
        section: bestChunk.section,
        metadata
      };
    })
  );
  
  return results.filter((result): result is SearchResult => result !== null)
    .sort((a: SearchResult, b: SearchResult) => b.relevance - a.relevance);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query, documents, searchType } = await request.json();
    
    if (!query || !documents) {
      return NextResponse.json(
        { error: 'Query and documents are required' },
        { status: 400 }
      );
    }

    let results: SearchResult[];

    switch (searchType) {
      case 'exact':
        results = documents
          .map((doc: Document) => {
        if (!doc.content) return null;
            const searchIndex = doc.content.toLowerCase().indexOf(query.toLowerCase());
            if (searchIndex === -1) return null;
        
            const start = Math.max(0, searchIndex - 100);
            const end = Math.min(doc.content.length, searchIndex + query.length + 100);
            const context = doc.content.slice(start, end);
        
        return {
          id: doc.id,
              text: doc.content.slice(searchIndex, searchIndex + query.length),
          context,
              relevance: 1
            };
          })
          .filter((result: SearchResult | null): result is SearchResult => result !== null);
        break;

      case 'fuzzy':
        // Use semantic search for fuzzy matching
        results = await performAISearch(query, documents);
        break;

      case 'ai':
        results = await performAISearch(query, documents);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid search type' },
          { status: 400 }
        );
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error in search:', error);
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    );
  }
} 