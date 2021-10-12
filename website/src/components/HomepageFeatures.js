import React from 'react';
import clsx from 'clsx';
import FileBundle from '../../static/img/undraw_file_bundle_xl7g.svg';
import ProgressiveApp from '../../static/img/undraw_progressive_app_m9ms.svg';
import BugFixing from '../../static/img/undraw_bug_fixing_oc7a.svg';
import DeveloperActivity from '../../static/img/undraw_developer_activity_bv83.svg';
import CloudSync from '../../static/img/undraw_cloud_sync_re_02p1.svg';
import SetPreferences from '../../static/img/undraw_set_preferences_kwia.svg';
import styles from './HomepageFeatures.module.css';

function Feature({
  title,
  description,
  Svg,
  leftClassName,
  rightClassName,
  inverted,
}) {
  const items = [
    <div
      key="FeatureLeft"
      className={clsx(
        'col padding-horiz--lg',
        styles.graphicContainer,
        leftClassName
      )}
    >
      {Svg ? <Svg className={styles.graphic} /> : null}
    </div>,
    <div
      key="FeatureRight"
      className={clsx(
        'col padding-horiz--lg',
        styles.featureContent,
        rightClassName
      )}
    >
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>,
  ];

  return inverted ? [...items].reverse() : items;
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
                {
                  'Leverage full Webpack ecosystem of plugins and loaders. Use plethora of '
                }
                <a
                  className={clsx('button button--link', styles.link)}
                  href="/docs/configuration/webpack-config"
                >
                  configuration options
                </a>
                {' to adjust the bundling to your needs. Take modules resolution into your hand ' +
                  'and freely use functionalities like symlinks or ' +
                  "unconventional project's structure."}
              </>
            }
            Svg={FileBundle}
            leftClassName="col--4"
            rightClassName="col--6"
          />
        </div>
        <div className="row margin-top--xl">
          <Feature
            title="Code Splitting support"
            description={
              <>
                {'Use '}
                <a
                  className={clsx('button button--link', styles.link)}
                  href="/docs/code-splitting/concepts"
                >
                  Code Splitting
                </a>
                {' to split your bundle into multiple files ' +
                  'and load them on-demand to improve initial loading times or to dynamically ' +
                  'deliver features. Split your code using dynamic import() function or by ' +
                  'using Module Federation.'}
              </>
            }
            Svg={CloudSync}
            leftClassName="col--6"
            rightClassName="col--6"
          />
        </div>
        <div className="row margin-top--xl">
          <Feature
            title="Built-in Flipper support"
            description={
              <>
                Use Flipper platform to inspect Application logs, Development
                server logs, React component tree with React DevTools, Layout,
                Network, Crashes and more.
              </>
            }
            Svg={BugFixing}
            leftClassName="col--4"
            rightClassName="col--6"
            inverted
          />
        </div>
        <div className="row margin-top--xl">
          <Feature
            title="Fully-featured development server"
            description={
              <>
                Build your application with ease. Take advantage of built-in
                support for Hot Module Replacement and React Refresh,
                symnbolication and Remote JavaScript debugging support.
              </>
            }
            Svg={DeveloperActivity}
            leftClassName="col--4"
            rightClassName="col--6"
          />
        </div>
        <div className="row margin-top--xl">
          <Feature
            title="Develop and bundle for any platform"
            description={
              <>
                Develop your application for any platform. Use built-in support
                for Android and iOS or bring support for your out-of-tree
                platform. Everything is configurable, nothing is hardcoded.
              </>
            }
            Svg={ProgressiveApp}
            leftClassName="col--4"
            rightClassName="col--6 col--offset-2"
            inverted
          />
        </div>
        <div className="row margin-top--xl">
          <Feature
            title="Configure it your way"
            description={
              <>
                {'Take full control over the '}
                <a
                  className={clsx('button button--link', styles.link)}
                  href="/docs/configuration/webpack-config"
                >
                  Webpack configuration
                </a>
                . Use our APIs - plugins and utilities - to make
                Webpack-produced bundle compatible with React Native.
              </>
            }
            Svg={SetPreferences}
            leftClassName="col--6"
            rightClassName="col--6"
          />
        </div>
      </div>
    </section>
  );
}
