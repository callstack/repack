import * as React from 'react';
import { Box, Badge, Text } from '@chakra-ui/react';

export type LogDataPrimitive = number | boolean | string | RegExp;

export type LogData = LogDataPrimitive | Record<string, LogDataPrimitive>;

export interface LogItem {
  type: 'debug' | 'info' | 'warn' | 'error';
  timestamp: number;
  issuer: string;
  message?: string;
  data: LogData | LogData[];
}

export function LogEntry({ value }: { value: LogItem }) {
  const data = React.useMemo(() => {
    return (Array.isArray(value.data) ? value.data : [value.data]).map(
      (item, index) => {
        switch (typeof item) {
          case 'number':
            return (
              <Box flexShrink="0">
                <Text
                  key={index}
                  color="blue.500"
                  fontFamily="mono"
                  marginRight="2"
                >
                  {item}
                </Text>
              </Box>
            );
          case 'boolean':
            return (
              <Box flexShrink="0">
                <Text
                  key={index}
                  color="red.500"
                  fontFamily="mono"
                  marginRight="2"
                >
                  {item ? 'true' : 'false'}
                </Text>
              </Box>
            );
          case 'string':
            return (
              <Box flexShrink="0">
                <Text
                  key={index}
                  color="orange.500"
                  fontFamily="mono"
                  marginRight="2"
                >
                  {`"${item}"`}
                </Text>
              </Box>
            );
          case 'object':
            return (
              <Box flexShrink="0">
                <Text
                  key={index}
                  color="orange.500"
                  fontFamily="mono"
                  marginRight="2"
                  textOverflow="ellipsis"
                  overflow="hidden"
                  whiteSpace="nowrap"
                >
                  {JSON.stringify(item)}
                </Text>
              </Box>
            );
          default:
            return null;
        }
      }
    );
  }, [value.data]);

  return (
    <Box
      borderRadius="md"
      backgroundColor="rgb(10, 11, 11)"
      padding="4"
      marginY="1"
    >
      <Box display="flex" flexDirection="row" alignItems="center">
        <Badge
          variant="outline"
          colorScheme={
            {
              info: 'blue',
              error: 'red',
              warn: 'yellow',
              debug: 'gray',
            }[value.type]
          }
        >
          {value.type}
        </Badge>
        <Text marginLeft="2" fontSize="sm" color="gray.400">
          {new Date(value.timestamp).toISOString().split('T')[1]}
        </Text>
      </Box>
      <Box display="flex" flexDirection="row" alignItems="center" marginTop="2">
        <Text
          fontWeight="bold"
          marginRight="1"
          fontFamily="mono"
          flexShrink="0"
        >
          {value.issuer}:
        </Text>
        {value.message ? (
          <Text marginRight="2" fontFamily="mono" flexShrink="0">
            {value.message}
          </Text>
        ) : null}
        {data}
      </Box>
    </Box>
  );
}
