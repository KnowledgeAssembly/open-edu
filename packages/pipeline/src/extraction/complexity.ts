export interface ComplexityAnalysis {
  complexity: 'low' | 'medium' | 'high';
  score: number;
  reasons: string[];
}

export interface ComplexityInput {
  pageCount: number;
  tableCount: number;
  imageCount: number;
  ocrConfidence: number;
  averagePageLength: number;
}

export class ComplexityDetector {
  analyze(input: ComplexityInput): ComplexityAnalysis {
    const reasons: string[] = [];
    let score = 0;

    if (input.pageCount > 50) {
      score += 30;
      reasons.push('many pages');
    } else if (input.pageCount > 15) {
      score += 15;
      reasons.push('moderate pages');
    }

    if (input.tableCount > 10) {
      score += 20;
      reasons.push('many tables');
    } else if (input.tableCount > 3) {
      score += 10;
      reasons.push('some tables');
    }

    if (input.imageCount > 20) {
      score += 20;
      reasons.push('many images');
    } else if (input.imageCount > 5) {
      score += 10;
      reasons.push('some images');
    }

    if (input.ocrConfidence < 0.7) {
      score += 20;
      reasons.push('low OCR confidence');
    }

    if (input.averagePageLength > 3000) {
      score += 10;
      reasons.push('long pages');
    }

    return {
      complexity: score >= 50 ? 'high' : score >= 20 ? 'medium' : 'low',
      score,
      reasons,
    };
  }
}
