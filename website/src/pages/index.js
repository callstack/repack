import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useThemeContext from '@theme/hooks/useThemeContext';
import HomepageFeatures from '../components/HomepageFeatures';
import Banner from '../../static/img/banner.svg';
import MobileApp from '../../static/img/undraw_Mobile_app_re_catg.svg';
import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  const { isDarkTheme } = useThemeContext();

  return (
    <header
      className={clsx('hero hero--primary padding-top--xl', styles.header)}
    >
      <div className="container">
        <div className="row">
          <div className="col col--4">
            <MobileApp className={styles.bannerGraphic} />
          </div>
          <div className="col col--6 col--offset-1 padding-horiz--lg">
            <Banner alt={siteConfig.title} />
            <p
              className={clsx('hero__subtitle margin-top--lg', styles.tagline)}
            >
              {siteConfig.tagline}
            </p>
            <div className={clsx('margin-top--lg', styles.buttons)}>
              <Link
                className={clsx(
                  'button button--lg',
                  isDarkTheme
                    ? 'button--outline button--primary'
                    : 'button--secondary',
                  styles.button
                )}
                to="/docs/getting-started"
              >
                Read docs
              </Link>
              <Link
                className={clsx(
                  'button button--lg button--outline button--secondary',
                  styles.button,
                  styles.secondButton
                )}
                to="/docs/configuration/webpack-config"
              >
                Check configuration
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
