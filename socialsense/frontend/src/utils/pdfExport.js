/**
 * PDF Export utility for CommentIQ analysis reports
 * Uses browser's print functionality for PDF generation
 */

export const generateAnalysisPDF = (analysis) => {
  // Create a new window with styled content for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Please allow popups to export PDF');
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreLabel = (score) => {
    if (score >= 90) return 'Exceptional';
    if (score >= 75) return 'Strong';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Work';
    if (score >= 20) return 'Poor';
    return 'Critical';
  };

  const getScoreColor = (score) => {
    if (score >= 75) return '#22C55E';
    if (score >= 60) return '#6C63FF';
    if (score >= 40) return '#F59E0B';
    return '#EF4444';
  };

  // Parse data
  let keywords = [];
  try {
    keywords = Array.isArray(analysis.keywords)
      ? analysis.keywords
      : JSON.parse(analysis.keywords || '[]');
  } catch (e) { keywords = []; }

  let themes = [];
  try {
    themes = Array.isArray(analysis.themes)
      ? analysis.themes
      : JSON.parse(analysis.themes || '[]');
  } catch (e) { themes = []; }

  let sentimentScores = {};
  try {
    sentimentScores = typeof analysis.sentiment_scores === 'string'
      ? JSON.parse(analysis.sentiment_scores)
      : (analysis.sentiment_scores || {});
  } catch (e) { sentimentScores = {}; }

  const filterStats = analysis.filter_stats || {};

  // Escape HTML entities to prevent XSS
  const escapeHtml = (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Convert markdown to simple HTML (with XSS protection)
  const markdownToHtml = (md) => {
    if (!md) return '';
    // First escape any HTML to prevent XSS
    let escaped = escapeHtml(md);
    // Then convert markdown syntax to HTML
    return escaped
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*([^*]+)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/gim, '<em>$1</em>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      .replace(/<li>/g, '<ul><li>')
      .replace(/<\/li>\n(?!<ul>)/g, '</li></ul>\n')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');
  };

  // Pre-escape user-controlled values for safe HTML interpolation
  const safeTitle = escapeHtml(analysis.video_title || 'CommentIQ');
  const safeCreatorNotes = escapeHtml(analysis.creator_notes);
  const safeCompetitorNotes = escapeHtml(analysis.competitor_notes);
  const safePriorityImprovement = escapeHtml(analysis.priority_improvement);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Analysis Report - ${safeTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1a1a2e;
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #6C63FF;
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #6C63FF;
    }
    .logo span { color: #38B2AC; }
    .date { color: #666; font-size: 14px; }
    .title {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #1a1a2e;
    }
    .subtitle { color: #666; margin-bottom: 24px; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 600;
      margin-right: 8px;
    }
    .badge-platform { background: #EEF2FF; color: #6C63FF; }
    .badge-score { background: ${analysis.video_score ? getScoreColor(analysis.video_score) + '20' : '#f0f0f0'}; color: ${analysis.video_score ? getScoreColor(analysis.video_score) : '#666'}; }
    .badge-competitor { background: #FEE2E2; color: #DC2626; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
    }
    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #6C63FF;
    }
    .stat-label { color: #666; font-size: 14px; }

    .section {
      margin-bottom: 32px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e0e0e0;
    }

    .score-card {
      background: linear-gradient(135deg, #6C63FF 0%, #38B2AC 100%);
      color: white;
      padding: 24px;
      border-radius: 16px;
      margin-bottom: 32px;
      text-align: center;
    }
    .score-value {
      font-size: 64px;
      font-weight: 700;
    }
    .score-label { font-size: 18px; opacity: 0.9; }

    .priority-box {
      background: #FEF3C7;
      border-left: 4px solid #F59E0B;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .priority-title {
      font-weight: 700;
      color: #B45309;
      margin-bottom: 8px;
    }

    .competitor-box {
      background: #FEE2E2;
      border-left: 4px solid #DC2626;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .competitor-title {
      font-weight: 700;
      color: #991B1B;
      margin-bottom: 8px;
    }

    .analysis-content {
      background: #f8f9fa;
      padding: 24px;
      border-radius: 12px;
    }
    .analysis-content h2 {
      font-size: 16px;
      color: #6C63FF;
      margin: 24px 0 12px;
    }
    .analysis-content h2:first-child { margin-top: 0; }
    .analysis-content h3 {
      font-size: 14px;
      color: #1a1a2e;
      margin: 16px 0 8px;
    }
    .analysis-content ul {
      margin-left: 20px;
      margin-bottom: 12px;
    }
    .analysis-content li { margin-bottom: 4px; }

    .keywords-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .keyword-chip {
      background: #EEF2FF;
      color: #6C63FF;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 13px;
    }

    .sentiment-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .sentiment-card {
      padding: 16px;
      border-radius: 12px;
      text-align: center;
    }
    .sentiment-positive { background: #DCFCE7; color: #166534; }
    .sentiment-neutral { background: #F3F4F6; color: #4B5563; }
    .sentiment-negative { background: #FEE2E2; color: #991B1B; }
    .sentiment-value { font-size: 28px; font-weight: 700; }
    .sentiment-pct { font-size: 14px; opacity: 0.8; }

    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      color: #666;
      font-size: 12px;
    }

    @media print {
      body { padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Comment<span>IQ</span></div>
      <div style="color: #666; font-size: 12px; margin-top: 4px;">AI-Powered Comment Analysis</div>
    </div>
    <div class="date">Generated: ${formatDate(new Date().toISOString())}</div>
  </div>

  <h1 class="title">${safeTitle}</h1>
  <p class="subtitle">
    <span class="badge badge-platform">${analysis.platform?.toUpperCase() || 'VIDEO'}</span>
    ${analysis.is_my_video && analysis.video_score != null ? `<span class="badge badge-score">Score: ${analysis.video_score}/100 - ${getScoreLabel(analysis.video_score)}</span>` : ''}
    ${analysis.is_competitor ? '<span class="badge badge-competitor">Competitor Analysis</span>' : ''}
  </p>

  ${analysis.is_my_video && analysis.video_score != null ? `
  <div class="score-card">
    <div class="score-value">${analysis.video_score}/100</div>
    <div class="score-label">${getScoreLabel(analysis.video_score)} Performance</div>
  </div>
  ` : ''}

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${(analysis.comment_count || 0).toLocaleString()}</div>
      <div class="stat-label">Total Comments</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${(filterStats.after_hard_filters || 0).toLocaleString()}</div>
      <div class="stat-label">Analyzed</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${keywords.length}</div>
      <div class="stat-label">Keywords</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${themes.length}</div>
      <div class="stat-label">Themes</div>
    </div>
  </div>

  ${safePriorityImprovement ? `
  <div class="priority-box">
    <div class="priority-title">Priority Improvement</div>
    <div>${safePriorityImprovement}</div>
  </div>
  ` : ''}

  ${analysis.is_competitor && analysis.competitor_analysis ? `
  <div class="section">
    <h2 class="section-title">Competitor Intelligence</h2>
    <div class="competitor-box">
      <div class="competitor-title">Competitive Analysis</div>
      <div class="analysis-content">
        ${markdownToHtml(analysis.competitor_analysis)}
      </div>
    </div>
  </div>
  ` : ''}

  <div class="section">
    <h2 class="section-title">Sentiment Analysis</h2>
    <div class="sentiment-grid">
      <div class="sentiment-card sentiment-positive">
        <div class="sentiment-value">${sentimentScores.positive || 0}</div>
        <div class="sentiment-pct">${(sentimentScores.positive_pct || 0).toFixed(1)}% Positive</div>
      </div>
      <div class="sentiment-card sentiment-neutral">
        <div class="sentiment-value">${sentimentScores.neutral || 0}</div>
        <div class="sentiment-pct">${(sentimentScores.neutral_pct || 0).toFixed(1)}% Neutral</div>
      </div>
      <div class="sentiment-card sentiment-negative">
        <div class="sentiment-value">${sentimentScores.negative || 0}</div>
        <div class="sentiment-pct">${(sentimentScores.negative_pct || 0).toFixed(1)}% Negative</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Top Keywords</h2>
    <div class="keywords-list">
      ${keywords.slice(0, 20).map(k => `<span class="keyword-chip">${k.word} (${k.count})</span>`).join('')}
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">AI Analysis</h2>
    <div class="analysis-content">
      ${markdownToHtml(analysis.summary || 'No analysis available.')}
    </div>
  </div>

  <div class="footer">
    <p>Generated by CommentIQ | ${formatDate(analysis.created_at)}</p>
    <p style="margin-top: 8px; font-size: 11px;">
      This report is confidential and intended for the recipient only.
    </p>
  </div>

  <script>
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

export default generateAnalysisPDF;
