const React = require('react');
const { Pressable, Text } = require('react-native');

function DateTimePickerMock({ value, onChange }) {
  return React.createElement(
    Pressable,
    {
      testID: 'datetimepicker-mock',
      accessibilityRole: 'button',
      onPress: () => onChange({ type: 'set', nativeEvent: {} }, value),
    },
    React.createElement(Text, null, 'DateTimePicker'),
  );
}

module.exports = DateTimePickerMock;
module.exports.default = DateTimePickerMock;
