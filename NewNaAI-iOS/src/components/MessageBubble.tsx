import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Bubble } from 'react-native-gifted-chat';
import Markdown from 'react-native-markdown-display';
import SyntaxHighlighter from 'react-native-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/styles/hljs';

export default function MessageBubble(props: any) {
  const { currentMessage } = props;
  const isUser = currentMessage.user._id === 1;

  const renderMessageText = () => {
    if (!isUser && currentMessage.text) {
      return (
        <View style={styles.markdownContainer}>
          <Markdown
            style={markdownStyles}
            rules={{
              code_block: (node, children, parent, styles) => {
                const language = node.attributes?.class?.replace('language-', '') || 'javascript';
                return (
                  <View key={node.key} style={styles.codeBlock}>
                    <SyntaxHighlighter
                      language={language}
                      style={atomOneDark}
                      customStyle={styles.syntax}
                      fontSize={14}
                    >
                      {node.content}
                    </SyntaxHighlighter>
                  </View>
                );
              },
            }}
          >
            {currentMessage.text}
          </Markdown>
        </View>
      );
    }
    return null;
  };

  return (
    <Bubble
      {...props}
      wrapperStyle={{
        left: {
          backgroundColor: '#1a1a1a',
          marginLeft: 0,
        },
        right: {
          backgroundColor: '#2563eb',
          marginRight: 0,
        },
      }}
      textStyle={{
        left: {
          color: '#fff',
          fontSize: 16,
        },
        right: {
          color: '#fff',
          fontSize: 16,
        },
      }}
      renderMessageText={renderMessageText}
    />
  );
}

const styles = StyleSheet.create({
  markdownContainer: {
    padding: 10,
  },
  codeBlock: {
    marginVertical: 5,
    borderRadius: 5,
    overflow: 'hidden',
  },
  syntax: {
    padding: 10,
    borderRadius: 5,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    color: '#fff',
    fontSize: 16,
  },
  heading1: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 10,
    color: '#fff',
  },
  heading2: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 8,
    color: '#fff',
  },
  heading3: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 6,
    color: '#fff',
  },
  strong: {
    fontWeight: 'bold',
  },
  em: {
    fontStyle: 'italic',
  },
  code_inline: {
    backgroundColor: '#2a2a2a',
    color: '#e06c75',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    fontFamily: 'monospace',
  },
  blockquote: {
    backgroundColor: '#1a1a1a',
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
    paddingLeft: 10,
    paddingVertical: 5,
    marginVertical: 5,
  },
  list_item: {
    marginVertical: 2,
  },
  link: {
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
});