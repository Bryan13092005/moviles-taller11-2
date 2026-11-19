import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { colors } from '../../../../theme/tokens';

interface Props {
  children: string;
  style?: StyleProp<TextStyle>;
}

type InlineToken =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'code'; content: string };

type TableAlignment = 'left' | 'center' | 'right';

const TABLE_COLUMN_WIDTH = 140;

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  // Reconoce negrita, codigo en linea y cursiva, conservando el texto intermedio.
  const regex = /\\([\s\S])|(\*\*|__)(.+?)\2|(`)(.+?)\4|(\*|_)(.+?)\6/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      const characterCode = match[1].charCodeAt(0);
      const isMarkdownPunctuation =
        characterCode >= 33 && characterCode <= 126 && !/[A-Za-z0-9]/.test(match[1]);
      tokens.push({
        type: 'text',
        content: isMarkdownPunctuation ? match[1] : `\\${match[1]}`,
      });
    } else if (match[2]) {
      tokens.push({ type: 'bold', content: match[3] });
    } else if (match[4]) {
      tokens.push({ type: 'code', content: match[5] });
    } else if (match[6]) {
      tokens.push({ type: 'italic', content: match[7] });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', content: text.slice(lastIndex) });
  }

  if (tokens.length === 0) {
    tokens.push({ type: 'text', content: text });
  }

  return tokens;
}

function parseTableRow(line: string): string[] | null {
  const trimmedLine = line.trim();
  if (!trimmedLine.includes('|')) {
    return null;
  }

  const content = trimmedLine.replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let cell = '';

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (character === '|' && content[index - 1] !== '\\') {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += character;
    }
  }

  cells.push(cell.trim());
  return cells;
}

function isTableSeparator(cells: string[]): boolean {
  return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function renderInline(text: string, baseStyle?: StyleProp<TextStyle>, keyPrefix = '') {
  const tokens = parseInline(text);
  // Cada token se representa como un Text anidado para aplicar formato sin separar el flujo.
  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (token.type) {
      case 'bold':
        return (
          <Text key={key} style={[baseStyle, styles.bold]}>
            {token.content}
          </Text>
        );
      case 'italic':
        return (
          <Text key={key} style={[baseStyle, styles.italic]}>
            {token.content}
          </Text>
        );
      case 'code':
        return (
          <Text key={key} style={[baseStyle, styles.inlineCode]}>
            {token.content}
          </Text>
        );
      default:
        return (
          <Text key={key} style={baseStyle}>
            {token.content}
          </Text>
        );
    }
  });
}

function renderTable(
  rows: string[][],
  alignments: TableAlignment[],
  style: StyleProp<TextStyle>,
  keyPrefix: string,
) {
  const columnCount = alignments.length;

  return (
    <ScrollView
      key={keyPrefix}
      horizontal
      showsHorizontalScrollIndicator
      style={styles.tableScroll}
      contentContainerStyle={styles.tableContent}
    >
      <View style={[styles.table, { minWidth: columnCount * TABLE_COLUMN_WIDTH }]}>
        {rows.map((row, rowIndex) => (
          <View
            key={`${keyPrefix}-row-${rowIndex}`}
            style={[
              styles.tableRow,
              rowIndex === 0 && styles.tableHeaderRow,
              rowIndex === rows.length - 1 && styles.tableLastRow,
            ]}
          >
            {alignments.map((alignment, columnIndex) => (
              <View
                key={`${keyPrefix}-cell-${rowIndex}-${columnIndex}`}
                style={[
                  styles.tableCell,
                  columnIndex === columnCount - 1 && styles.tableLastCell,
                ]}
              >
                <Text
                  style={[
                    style,
                    styles.tableCellText,
                    { textAlign: alignment },
                    rowIndex === 0 && styles.tableHeaderText,
                  ]}
                >
                  {renderInline(
                    row[columnIndex] ?? '',
                    [style, styles.tableCellText, { textAlign: alignment }],
                    `${keyPrefix}-${rowIndex}-${columnIndex}`,
                  )}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export const MarkdownText: React.FC<Props> = ({ children, style }) => {
  const content = children ?? '';
  // Los segmentos impares entre delimitadores de triple acento grave son bloques de codigo.
  const segments = content.split(/```/);

  return (
    <View style={styles.container}>
      {segments.map((segment, segIndex) => {
        const isCodeBlock = segIndex % 2 === 1;

        if (isCodeBlock) {
          const lines = segment.replace(/^\n/, '').replace(/\n$/, '');
          return (
            <View key={`seg-${segIndex}`} style={styles.codeBlock}>
              <Text selectable style={[style, styles.codeBlockText]}>{lines}</Text>
            </View>
          );
        }

        const lines = segment.split('\n');
        const renderedLines: React.ReactNode[] = [];

        for (let lineIndex = 0; lineIndex < lines.length;) {
          const headerCells = parseTableRow(lines[lineIndex]);
          const separatorCells =
            lineIndex + 1 < lines.length ? parseTableRow(lines[lineIndex + 1]) : null;

          if (
            headerCells &&
            headerCells.length >= 2 &&
            separatorCells &&
            separatorCells.length === headerCells.length &&
            isTableSeparator(separatorCells)
          ) {
            const tableRows = [headerCells];
            let tableEnd = lineIndex + 2;

            while (tableEnd < lines.length) {
              const row = parseTableRow(lines[tableEnd]);
              if (!row || row.length !== headerCells.length) {
                break;
              }
              tableRows.push(row);
              tableEnd += 1;
            }

            const alignments = separatorCells.map((cell): TableAlignment => {
              const alignsLeft = cell.startsWith(':');
              const alignsRight = cell.endsWith(':');
              if (alignsLeft && alignsRight) return 'center';
              if (alignsRight) return 'right';
              return 'left';
            });

            renderedLines.push(
              renderTable(
                tableRows,
                alignments,
                style,
                `table-${segIndex}-${lineIndex}`,
              ),
            );
            lineIndex = tableEnd;
            continue;
          }

          const line = lines[lineIndex];

          // Mantiene el espacio visual de las lineas en blanco dentro del contenido Markdown.
          if (line.trim() === '') {
            renderedLines.push(
              <View key={`line-${segIndex}-${lineIndex}`} style={styles.emptyLine} />,
            );
            lineIndex += 1;
            continue;
          }

          // Prioriza encabezados antes de listas y texto para interpretar cada linea una sola vez.
          const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
          if (headingMatch) {
            const level = headingMatch[1].length;
            const headingStyle =
              level <= 2 ? styles.h1 : level === 3 ? styles.h2 : styles.h3;
            renderedLines.push(
              <Text key={`line-${segIndex}-${lineIndex}`} style={[style, headingStyle]}>
                {renderInline(
                  headingMatch[2],
                  [style, headingStyle],
                  `${segIndex}-${lineIndex}`,
                )}
              </Text>,
            );
            lineIndex += 1;
            continue;
          }

          const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
          if (bulletMatch) {
            renderedLines.push(
              <View key={`line-${segIndex}-${lineIndex}`} style={styles.listRow}>
                <Text style={[style, styles.bullet]}>{'\u2022'}</Text>
                <Text style={[style, styles.listText]}>
                  {renderInline(bulletMatch[1], style, `${segIndex}-${lineIndex}`)}
                </Text>
              </View>,
            );
            lineIndex += 1;
            continue;
          }

          const orderedMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
          if (orderedMatch) {
            renderedLines.push(
              <View key={`line-${segIndex}-${lineIndex}`} style={styles.listRow}>
                <Text style={[style, styles.bullet]}>{orderedMatch[1]}.</Text>
                <Text style={[style, styles.listText]}>
                  {renderInline(orderedMatch[2], style, `${segIndex}-${lineIndex}`)}
                </Text>
              </View>,
            );
            lineIndex += 1;
            continue;
          }

          renderedLines.push(
            <Text key={`line-${segIndex}-${lineIndex}`} style={style}>
              {renderInline(line, style, `${segIndex}-${lineIndex}`)}
            </Text>,
          );
          lineIndex += 1;
        }

        return (
          <View key={`seg-${segIndex}`}>
            {renderedLines}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 2,
    flexShrink: 1,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  inlineCode: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    backgroundColor: 'rgba(41,32,68,0.12)',
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  codeBlock: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
    maxWidth: '100%',
  },
  codeBlockText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 13,
    lineHeight: 18,
    color: colors.plum,
  },
  h1: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: 4,
    marginBottom: 2,
  },
  h2: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 4,
    marginBottom: 2,
  },
  h3: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 2,
    marginBottom: 2,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 1,
  },
  bullet: {
    width: 18,
  },
  listText: {
    flex: 1,
  },
  emptyLine: {
    height: 8,
  },
  tableScroll: {
    width: '100%',
    marginVertical: 4,
  },
  tableContent: {
    minWidth: '100%',
  },
  table: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.plumBorder,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.plumBorder,
  },
  tableHeaderRow: {
    backgroundColor: 'rgba(41,32,68,0.06)',
  },
  tableLastRow: {
    borderBottomWidth: 0,
  },
  tableCell: {
    width: TABLE_COLUMN_WIDTH,
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.plumBorder,
  },
  tableLastCell: {
    borderRightWidth: 0,
  },
  tableCellText: {
    flexShrink: 1,
  },
  tableHeaderText: {
    fontWeight: '700',
  },
});
