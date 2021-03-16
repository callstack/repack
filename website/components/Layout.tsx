import React from 'react';
import Head from 'next/head';
import NextLink from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { Link } from './Link';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-black w-full flex flex-col min-h-scree text-auxiliary-100 min-h-screen">
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="Learn how to build a personal website using Next.js"
        />

        <meta name="og:title" content="Site title" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fira+Code&family=Open+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <header className="flex justify-center">
        <div className="container max-w-screen-lg py-4 flex justify-between">
          <NextLink href="/">
            <a className="text-2xl tracking-wide">
              <span className="text-primary-300">react-native</span>
              -webpack-toolkit
            </a>
          </NextLink>
          <div className="text-xs flex items-center">
            <NextLink href="/docs/api">
              <a className="px-6 py-2 transition ease-in duration-200 uppercase rounded-full hover:bg-primary-300 hover:text-white border-2 border-primary-300 focus:outline-none">
                API docs
              </a>
            </NextLink>
            <NextLink href="/">
              <a className="transition ease-in duration-200 uppercase rounded-full text-primary-300 hover:text-primary-100 focus:outline-none ml-2">
                <FontAwesomeIcon className="h-9 w-9" icon={faGithub} />
              </a>
            </NextLink>
          </div>
        </div>
      </header>
      <main className="flex flex-1 justify-center">
        <div className="container max-w-screen-lg py-10">{children}</div>
      </main>
      <footer className="bg-auxiliary-dark-100 h-20 flex justify-center">
        <div className="container max-w-screen-lg flex justify-between h-full items-center">
          <div className="text-auxiliary-200 flex">
            {'Built with'}
            <Link href="/" external className="mx-1" bold>
              TypeDoc
              <FontAwesomeIcon
                className="h-4 w-4 ml-1"
                icon={faExternalLinkAlt}
              />
            </Link>
            {'and'}
            <Link href="/" external className="mx-1" bold>
              Next.js
              <FontAwesomeIcon
                className="h-4 w-4 ml-1 mr-2"
                icon={faExternalLinkAlt}
              />
            </Link>
          </div>
          <div>
            <Link href="/" external bold>
              <FontAwesomeIcon className="h-5 w-5 mr-2" icon={faGithub} />
              GitHub
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
