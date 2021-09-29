import React from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { DevServerProvider } from './context/DevServerContext';
import { Artifacts } from './pages/Artifacts';
import { Dash } from './pages/Dash';
import { ServerLogs } from './pages/ServerLogs';

export const App = () => {
  return (
    <DevServerProvider>
      <Router>
        <AppLayout>
          <Route exact path="/dashboard">
            <Dash />
          </Route>
          <Route path="/dashboard/logs">
            <ServerLogs />
          </Route>
          <Route path="/dashboard/artifacts">
            <Artifacts />
          </Route>
        </AppLayout>
      </Router>
    </DevServerProvider>
  );
};
