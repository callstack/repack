import { StyleSheet, Text } from 'react-native';

type ReportProps = {
  testID: string;
  name: string;
  value: unknown;
};

const Report = ({ testID, name, value }: ReportProps) => (
  <Text testID={testID} style={styles.row}>
    {`${name}: ${String(value)}`}
  </Text>
);

const styles = StyleSheet.create({
  row: {
    alignSelf: 'stretch',
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#200a12',
  },
});

export default Report;
