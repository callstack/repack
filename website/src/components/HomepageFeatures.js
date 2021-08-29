import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';

function Feature({ title, description }) {
  return (
    <div className={clsx('col col--4')}>
      <div className="padding-horiz--md">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          <Feature
            title="Webpack-powered solution for advanced use cases"
            description={
              <>
                Leverage full Webpack ecosystem of plugins and loaders. Use
                plethora of configuration options to adjust the bundling to your
                needs. Take modules resolution into your hand and freely use
                functionalities like symlinks or unconventional project&apos;s
                structure.
              </>
            }
          />
          <Feature
            title="Develop and bundle for any platform"
            description={
              <>
                Develop your application for any platform. Use built-in support
                for Android and iOS or bring support for your out-of-tree
                platform. Everything is configurable, nothing is hardcoded.
              </>
            }
          />
          <Feature
            title="Built-in Flipper support"
            description={
              <>
                Use Flipper platform to inspect Application logs, Development
                server logs, React component tree with React DevTools, Layout,
                Network, Crashes and more.
              </>
            }
          />
        </div>
        <div className="row">
          <Feature
            title="Fully-featured development server"
            description={
              <>
                Build your application with ease. Take advantage of built-in
                support for Hot Module Replacement and React Refresh,
                symnbolication and Remote JavaScript debugging support.
              </>
            }
          />
          <Feature
            title="Asynchronous chunks support"
            description={
              <>
                Use asynchronous chunks to split your bundle into multiple files
                and load them on-demand improve initial loading times. Split
                your code using dynamic import() function or manually declaring
                them inside your Webpack config.
              </>
            }
          />
          <Feature
            title="Configure it your way"
            description={
              <>
                Take full control over the Webpack configuration. Use our APIs -
                plugins and utilities - to make Webpack-produced bundle
                compatible with React Native.
              </>
            }
          />
        </div>
      </div>
    </section>
  );
}
