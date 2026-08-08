import { getSlideshowItemText } from './slideshow';

function escapeCsvField(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildSessionCsv(session, pagesWithAnswers) {
  const rows = [
    [
      'ลำดับหน้า',
      'ประเภท',
      'คำถาม/ข้อความ',
      'ชื่อผู้ตอบ',
      'คำตอบ',
      'คำตอบช่องที่ 1',
      'คำตอบช่องที่ 2',
      'เวลาที่ตอบ',
    ],
  ];

  pagesWithAnswers.forEach((page) => {
    const pageLabel =
      page.title ||
      page.content?.questionText ||
      page.content?.messageText ||
      (page.content?.items || []).map(getSlideshowItemText).join(' | ');
    if (!page.answers || page.answers.length === 0) {
      rows.push([page.order + 1, page.type, pageLabel, '', '', '', '', '']);
      return;
    }
    page.answers.forEach((answer) => {
      const isSplit = answer.textA != null || answer.textB != null;
      rows.push([
        page.order + 1,
        page.type,
        pageLabel,
        answer.name,
        isSplit ? '' : answer.text,
        answer.textA || '',
        answer.textB || '',
        answer.createdAt ? answer.createdAt.toDate().toLocaleString('th-TH') : '',
      ]);
    });
  });

  const csvBody = rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n');
  return '﻿' + csvBody;
}

export function downloadCsv(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
