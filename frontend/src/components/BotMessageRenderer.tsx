import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// ─── Segment Types ─────────────────────────────────────────────────────────────

type SegmentType = 'text' | 'money' | 'percent' | 'category' | 'date';

interface Segment {
  type: SegmentType;
  value: string;
}

// ─── Parser ────────────────────────────────────────────────────────────────────

/**
 * Tách 1 dòng text thành các segment có type:
 *   - money:    **1.200.000đ** hoặc **-800.000đ**
 *   - percent:  **86%**
 *   - category: **Ăn uống**, **Lương**, v.v.
 *   - date:     YYYY-MM-DD hoặc DD/MM/YYYY
 *   - text:     phần còn lại
 */
function parseLine(line: string): Segment[] {
  const segments: Segment[] = [];

  // Match: **...** | YYYY-MM-DD | DD/MM/YYYY
  const regex = /\*\*([^*]+)\*\*|(\d{4}-\d{2}-\d{2})(?!\d)|(\d{2}\/\d{2}\/\d{4})/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(line)) !== null) {
    // Phần text thường trước match
    if (m.index > last) {
      segments.push({ type: 'text', value: line.slice(last, m.index) });
    }

    if (m[1] !== undefined) {
      // **...** pattern
      const content = m[1].trim();
      if (/^-?[\d.,]+đ$/.test(content)) {
        segments.push({ type: 'money', value: content });
      } else if (/^\d+(\.\d+)?%$/.test(content)) {
        segments.push({ type: 'percent', value: content });
      } else {
        segments.push({ type: 'category', value: content });
      }
    } else {
      // Date pattern: chuẩn hóa về DD/MM/YYYY
      const raw = m[2] || m[3];
      let display = raw;
      if (m[2]) {
        const [y, mo, d] = raw.split('-');
        display = `${d}/${mo}/${y}`;
      }
      segments.push({ type: 'date', value: display });
    }

    last = m.index + m[0].length;
  }

  // Phần text còn lại cuối dòng
  if (last < line.length) {
    segments.push({ type: 'text', value: line.slice(last) });
  }

  return segments;
}

// ─── Segment Renderer ──────────────────────────────────────────────────────────

function renderSegment(seg: Segment, key: number) {
  switch (seg.type) {
    case 'money':
      return (
        <Text key={key} style={styles.money}>
          {seg.value}
        </Text>
      );
    case 'percent':
      return (
        <Text key={key} style={styles.percent}>
          {seg.value}
        </Text>
      );
    case 'category':
      return (
        <Text key={key} style={styles.category}>
          {seg.value}
        </Text>
      );
    case 'date':
      return (
        <Text key={key} style={styles.date}>
          {seg.value}
        </Text>
      );
    default:
      return <Text key={key}>{seg.value}</Text>;
  }
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface BotMessageRendererProps {
  text: string;
}

export function BotMessageRenderer({ text }: Readonly<BotMessageRendererProps>) {
  const lines = text.split('\n');

  return (
    <View style={styles.container}>
      {lines.map((line, li) => {
        // Dòng trống → khoảng cách nhỏ
        if (line.trim() === '') {
          return <View key={li} style={styles.emptyLine} />;
        }

        const segments = parseLine(line);
        const isDataLine = segments.some(s => s.type !== 'text');

        return (
          <Text
            key={li}
            style={[styles.base, li > 0 && styles.lineSpacing, isDataLine && styles.dataLine]}
          >
            {segments.map((seg, si) => renderSegment(seg, si))}
          </Text>
        );
      })}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  base: {
    color: '#0F172A',
    fontSize: 15,
    lineHeight: 24,
  },
  lineSpacing: {
    marginTop: 3,
  },
  dataLine: {
    lineHeight: 26,
  },
  emptyLine: {
    height: 6,
  },

  // 💰 Số tiền → teal đậm
  money: {
    color: '#0D9488',
    fontWeight: '800',
    fontSize: 15,
  },

  // 📊 Phần trăm → amber
  percent: {
    color: '#D97706',
    fontWeight: '800',
    fontSize: 15,
  },

  // 🏷️ Danh mục / bold text → tím violet
  category: {
    color: '#7C3AED',
    fontWeight: '800',
    fontSize: 15,
  },

  // 📅 Ngày tháng → xanh dương nhạt
  date: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
});
