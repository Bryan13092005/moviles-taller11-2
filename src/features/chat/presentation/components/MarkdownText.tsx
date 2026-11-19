import React from 'react';
import { View, Text, StyleSheet, TextStyle, StyleProp, Platform } from 'react-native';

interface Props {
  children: string;
  style?: StyleProp<TextStyle>;
}

type InlineToken =
  | { type: 'text'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'code'; content: string };

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  // Reconoce negrita, codigo en linea y cursiva, conservando el texto intermedio.
  const regex = /(\*\*|__)(.+?)\1|(`)(.+?)\3|(\*|_)(.+?)\5/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }

    if (match[1]) {
      tokens.push({ type: 'bold', content: match[2] });
    } else if (match[3]) {
      tokens.push({ type: 'code', content: match[4] });
    } else if (match[5]) {
      tokens.push({ type: 'italic', content: match[6] });
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
              <Text style={[styles.codeBlockText, style]}>{lines}</Text>
            </View>
          );
        }

        const lines = segment.split('\n');
        return (
          <View key={`seg-${segIndex}`}>
            {lines.map((line, lineIndex) => {
              // Mantiene el espacio visual de las lineas en blanco dentro del contenido Markdown.
              if (line.trim() === '') {
                return <View key={`line-${segIndex}-${lineIndex}`} style={styles.emptyLine} />;
              }

              // Prioriza encabezados antes de listas y texto para interpretar cada linea una sola vez.
              const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
              if (headingMatch) {
                const level = headingMatch[1].length;
                const headingStyle =
                  level <= 2 ? styles.h1 : level === 3 ? styles.h2 : styles.h3;
                return (
                  <Text key={`line-${segIndex}-${lineIndex}`} style={[style, headingStyle]}>
                    {renderInline(headingMatch[2], [style, headingStyle], `${segIndex}-${lineIndex}`)}
                  </Text>
                );
              }

              const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
              if (bulletMatch) {
                return (
                  <View key={`line-${segIndex}-${lineIndex}`} style={styles.listRow}>
                    <Text style={[style, styles.bullet]}>{'\u2022'}</Text>
                    <Text style={[style, styles.listText]}>
                      {renderInline(bulletMatch[1], style, `${segIndex}-${lineIndex}`)}
                    </Text>
                  </View>
                );
              }

              const orderedMatch = line.match(/^\s*(\d+)\.\s+(.*)$/);
              if (orderedMatch) {
                return (
                  <View key={`line-${segIndex}-${lineIndex}`} style={styles.listRow}>
                    <Text style={[style, styles.bullet]}>{orderedMatch[1]}.</Text>
                    <Text style={[style, styles.listText]}>
                      {renderInline(orderedMatch[2], style, `${segIndex}-${lineIndex}`)}
                    </Text>
                  </View>
                );
              }

              return (
                <Text key={`line-${segIndex}-${lineIndex}`} style={style}>
                  {renderInline(line, style, `${segIndex}-${lineIndex}`)}
                </Text>
              );
            })}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  inlineCode: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  codeBlock: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
  },
  codeBlockText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 13,
    lineHeight: 18,
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
});
