import * as fs from 'fs';
import * as path from 'path';

export interface DiffBlock {
  search: string;
  replace: string;
}

export interface ApplyDiffParams {
  path: string;
  diff: string;
}

export interface InsertLinesParams {
  path: string;
  line_number: number;
  content: string;
}

export interface DeleteLinesParams {
  path: string;
  line_number: number;
  count: number;
}

export async function applyDiff(filePath: string, diffText: string): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, output: '', error: `File not found: ${filePath}` };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const diffBlocks = parseDiff(diffText);
    
    let modifiedContent = content;
    
    for (const block of diffBlocks) {
      const searchLines = block.search.split('\n');
      const replaceLines = block.replace.split('\n');
      
      const startIndex = findSearchBlock(modifiedContent, searchLines);
      
      if (startIndex === -1) {
        return { 
          success: false, 
          output: '', 
          error: `Search block not found in file. Make sure the SEARCH content exactly matches the file content including whitespace and indentation.` 
        };
      }
      
      const modifiedLines = modifiedContent.split('\n');
      modifiedLines.splice(startIndex, searchLines.length, ...replaceLines);
      modifiedContent = modifiedLines.join('\n');
    }
    
    fs.writeFileSync(filePath, modifiedContent, 'utf-8');
    
    return { 
      success: true, 
      output: `Successfully applied ${diffBlocks.length} diff block(s) to ${filePath}` 
    };
    
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

export async function insertLines(filePath: string, lineNumber: number, content: string): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, output: '', error: `File not found: ${filePath}` };
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    
    const insertLines = content.split('\n');
    lines.splice(lineNumber - 1, 0, ...insertLines);
    
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    
    return { 
      success: true, 
      output: `Successfully inserted ${insertLines.length} line(s) at line ${lineNumber}` 
    };
    
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

export async function deleteLines(filePath: string, lineNumber: number, count: number): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, output: '', error: `File not found: ${filePath}` };
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    
    if (lineNumber < 1 || lineNumber > lines.length) {
      return { success: false, output: '', error: `Invalid line number: ${lineNumber}` };
    }
    
    const actualCount = Math.min(count, lines.length - lineNumber + 1);
    lines.splice(lineNumber - 1, actualCount);
    
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    
    return { 
      success: true, 
      output: `Successfully deleted ${actualCount} line(s) starting from line ${lineNumber}` 
    };
    
  } catch (error: any) {
    return { success: false, output: '', error: error.message };
  }
}

function parseDiff(diffText: string): DiffBlock[] {
  const blocks: DiffBlock[] = [];
  
  const searchRegex = /<<<<<<< SEARCH\s*\n([\s\S]*?)\n=======\s*\n([\s\S]*?)\n>>>>>>> REPLACE/g;
  
  let match;
  while ((match = searchRegex.exec(diffText)) !== null) {
    blocks.push({
      search: match[1].trimEnd(),
      replace: match[2].trimEnd()
    });
  }
  
  if (blocks.length === 0) {
    throw new Error('No valid diff blocks found. Expected format: <<<<<<< SEARCH\\n...\\n=======\\n...\\n>>>>>>> REPLACE');
  }
  
  return blocks;
}

function findSearchBlock(content: string, searchLines: string[]): number {
  const contentLines = content.split('\n');
  
  for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
    let match = true;
    
    for (let j = 0; j < searchLines.length; j++) {
      if (contentLines[i + j] !== searchLines[j]) {
        match = false;
        break;
      }
    }
    
    if (match) {
      return i;
    }
  }
  
  return -1;
}
