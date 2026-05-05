import { ResearchPaper, Category } from '../types';

export interface ExportOptions {
  format: 'markdown' | 'json' | 'txt';
}

/**
 * Generate markdown export content for papers in a category
 */
export function generateMarkdownExport(category: Category, papers: ResearchPaper[]): string {
  let content = `# Category: ${category.name}\n\n`;
  
  if (category.description) {
    content += `> ${category.description}\n\n`;
  }

  content += `**Export Date:** ${new Date().toISOString().split('T')[0]}\n`;
  content += `**Total Papers:** ${papers.length}\n\n`;
  content += `---\n\n`;

  papers.forEach((paper, index) => {
    content += `## Paper ${index + 1}: ${paper.title}\n\n`;
    content += `**Authors:** ${paper.authors}\n\n`;
    
    if (paper.description) {
      content += `**Description:** ${paper.description}\n\n`;
    }

    content += `### Citation\n\`\`\`bibtex\n${paper.citation}\n\`\`\`\n\n`;

    if (paper.summary) {
      content += `### Summary\n${paper.summary}\n\n`;
    }

    if (paper.conversationNotes) {
      content += `### Conversation Notes\n${paper.conversationNotes}\n\n`;
    }

    content += `---\n\n`;
  });

  return content;
}

/**
 * Generate JSON export content for papers in a category
 */
export function generateJsonExport(category: Category, papers: ResearchPaper[]): string {
  const exportData = {
    category: {
      name: category.name,
      description: category.description,
    },
    exportDate: new Date().toISOString(),
    totalPapers: papers.length,
    papers: papers.map((paper) => ({
      title: paper.title,
      authors: paper.authors,
      description: paper.description,
      citation: paper.citation,
      summary: paper.summary || null,
      conversationNotes: paper.conversationNotes || null,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Generate plain text export content for papers in a category
 */
export function generateTextExport(category: Category, papers: ResearchPaper[]): string {
  let content = `CATEGORY: ${category.name}\n`;
  content += `${'='.repeat(80)}\n\n`;
  
  if (category.description) {
    content += `Description: ${category.description}\n\n`;
  }

  content += `Export Date: ${new Date().toISOString().split('T')[0]}\n`;
  content += `Total Papers: ${papers.length}\n\n`;
  content += `${'='.repeat(80)}\n\n`;

  papers.forEach((paper, index) => {
    content += `PAPER ${index + 1}\n`;
    content += `${'-'.repeat(80)}\n\n`;
    
    content += `Title: ${paper.title}\n`;
    content += `Authors: ${paper.authors}\n\n`;
    
    if (paper.description) {
      content += `Description:\n${paper.description}\n\n`;
    }

    content += `CITATION:\n${paper.citation}\n\n`;

    if (paper.summary) {
      content += `SUMMARY:\n${paper.summary}\n\n`;
    }

    if (paper.conversationNotes) {
      content += `CONVERSATION NOTES:\n${paper.conversationNotes}\n\n`;
    }

    content += `${'='.repeat(80)}\n\n`;
  });

  return content;
}

/**
 * Download file with the given content
 */
export function downloadFile(content: string, fileName: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export category papers in the specified format
 */
export function exportCategoryPapers(
  category: Category,
  papers: ResearchPaper[],
  format: ExportOptions['format'] = 'markdown'
): void {
  let content: string;
  let fileName: string;
  let mimeType: string;

  const sanitizedCategoryName = category.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
  const dateStr = new Date().toISOString().split('T')[0];

  switch (format) {
    case 'json':
      content = generateJsonExport(category, papers);
      fileName = `${sanitizedCategoryName}-${dateStr}.json`;
      mimeType = 'application/json';
      break;
    
    case 'txt':
      content = generateTextExport(category, papers);
      fileName = `${sanitizedCategoryName}-${dateStr}.txt`;
      mimeType = 'text/plain';
      break;
    
    case 'markdown':
    default:
      content = generateMarkdownExport(category, papers);
      fileName = `${sanitizedCategoryName}-${dateStr}.md`;
      mimeType = 'text/markdown';
      break;
  }

  downloadFile(content, fileName, mimeType);
}
