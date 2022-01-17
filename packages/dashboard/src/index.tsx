import './globals';
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import React from 'react';
import { render } from 'react-dom';
import { App } from './App';
import './index.css';

if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line import/no-extraneous-dependencies
  const { inspect } = require('@xstate/inspect');
  inspect({
    iframe: false,
  });
}

render(<App />, document.getElementById('root'));
