import React from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { Artifacts } from './pages/Artifacts';
import { Dash } from './pages/Dash';
import { Logs } from './pages/Logs';

export const App = () => {
  return (
    <Router>
      <AppLayout>
        <Route exact path="/dashboard">
          <Dash />
        </Route>
        <Route path="/dashboard/logs">
          <Logs />
        </Route>
        <Route path="/dashboard/artifacts">
          <Artifacts />
        </Route>
      </AppLayout>
    </Router>
  );
};
