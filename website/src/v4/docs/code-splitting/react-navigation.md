# React Navigation

When using [Async chunks](./usage#async-chunks), you can easily integrate React components which are
part of async chunks, by created a wrapper component
with `React.Suspense` and passing it as a `component` prop to a `Screen`, e.g:

```jsx
import * as React from 'react';
import { Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStaticNavigation } from '@react-navigation/native';

const StudentSide = React.lazy(
  () => import(/* webpackChunkName: "student" */ './StudentSide.js')
);

const TeacherSide = React.lazy(
  () => import(/* webpackChunkName: "teacher" */ './TeacherSide.js')
);

const StudentSideScreen = () => {
  const { params: { user } } = useRoute();

  return (
    <StudentSide user={user} />
  );
};

const TeacherSideScreen = () => {
  const { params: { user } } = useRoute();

  return (
    <TeacherSide user={user} />
  );
};

const Stack = createNativeStackNavigator({
  groups: {
    App: {
      screenLayout: ({ children }) => (
        <React.Suspense fallback={<Text>Loading...</Text>}>
          {children}
        </React.Suspense>
      ),
      screens: {
        StudentScreen: {
          screen: StudentSideScreen,
          options: {
            title: "Student",
          },
        },
        TeacherScreen: {
          screen: TeacherSideScreen,
          options: {
            title: "Teacher",
          },
        },
      },
    },
  },
});

const Navigation = createStaticNavigation(Stack);

export function Home() {
  return (
    <Navigation />
  )
}

```

React context is passed to the chunks as well, so you can use `useNavigation`, `useRoute` and other
hooks inside chunks (e.g: inside `StudentSide` or `TeacherSide` components) to access data or
interact with React Navigation.

:::caution

For [Scripts](./usage#scripts) approach, there's no easy way to integrate React Navigation.
It should be possible to hack your way around it, but in general, we don't recommend scripts
approach unless you know what you're doing.

:::

:::info

[Module Federation](./usage#module-federation) approach is not officially supported yet, but it
should be fairly straightforward to integrate React Navigation with it. For a reference how it could
be done, check out this code: https://github.com/zamotany/module-federation-repack/blob/main/host/Root.js#L51-L86

:::

