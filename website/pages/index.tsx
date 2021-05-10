import React from 'react';
import Head from 'next/head';
import NextLink from 'next/link';
import { Layout } from '../components/Layout';

function Feature({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-row justify-center py-10">
      <div className="material-icons text-6xl text-emerald-500 mr-10 hidden md:block">
        done_outline
      </div>
      <div className="w-full lg:w-1/2">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        {children}
      </div>
    </li>
  );
}

export default function Home() {
  return (
    <Layout>
      <Head>
        <title>@callstack/nativepack</title>
      </Head>
      <div className="px-4">
        <h1 className="text-center text-3xl italic tracking-wide xl:px-80">
          A Webpack-based toolkit to build your React Native application with
          full support of Webpack ecosystem.
        </h1>
        <div className="flex flex-col sm:flex-row sm:justify-center mt-8">
          <a
            href="https://github.com/callstack/@callstack/nativepack#@callstack/nativepack"
            className="inline-flex items-center my-2 mx-2 px-3 py-2 transition ease-in duration-200 rounded-sm font-bold border border-emerald-700 hover:text-cool-gray-200 hover:bg-emerald-600 hover:border-emerald-600"
            target="_blank"
            rel="noreferrer"
          >
            Read more
            <span className="inline-block material-icons text-xl ml-1">
              launch
            </span>
          </a>
          <a
            href="https://github.com/callstack/@callstack/nativepack#installation--setup"
            className="inline-flex items-center my-2 mx-2 px-3 py-2 transition ease-in duration-200 rounded-sm font-bold border border-orange-800 hover:text-cool-gray-200 hover:bg-orange-700 hover:border-orange-700"
            target="_blank"
            rel="noreferrer"
          >
            Get started
            <span className="inline-block material-icons text-xl ml-1">
              launch
            </span>
          </a>
        </div>
        <ul className="mt-16 lg:pl-24">
          <Feature title="Webpack-powered solution for advanced use cases">
            <div>
              Leverage full Webpack ecosystem of plugins and loaders. Use
              plethora of configuration options to adjust the bundling to your
              needs. Take modules resolution into your hand and freely use
              functionalities like symlinks or unconventional project&apos;s
              structure.
            </div>
            <NextLink href="/docs/api#webpack-plugin-classes">
              <a className="inline-flex items-center mt-6 px-3 py-2 transition ease-in duration-200 rounded-sm font-bold border border-blue-700 hover:text-cool-gray-200 hover:bg-blue-600 hover:border-blue-600">
                Check plugins
                <span className="inline-block material-icons text-xl ml-1">
                  east
                </span>
              </a>
            </NextLink>
          </Feature>
          <Feature title="Develop and bundle for any platform">
            <span>
              Develop your application for any platform. Use built-in support
              for Android and iOS or bring support for your out-of-tree
              platform. Everything is configurable, nothing is hardcoded.
            </span>
          </Feature>
          <Feature title="Built-in Flipper support">
            <div>
              Use Flipper platform to inspect Application logs, Development
              server logs, React component tree with React DevTools, Layout,
              Network, Crashes and more.
            </div>
          </Feature>
          <Feature title="Fully-featured development server">
            <div>
              Build your application with ease. Take advantage of built-in
              support for Hot Module Replacement and React Refresh,
              symnbolication and Remote JavaScript debugging support.
            </div>
            <a
              href="https://github.com/callstack/@callstack/nativepack#features"
              className="inline-flex items-center mt-6 px-3 py-2 transition ease-in duration-200 rounded-sm font-bold border border-orange-800 hover:text-cool-gray-200 hover:bg-orange-700 hover:border-orange-700"
              target="_blank"
              rel="noreferrer"
            >
              Check the feature list
              <span className="inline-block material-icons text-xl ml-1">
                launch
              </span>
            </a>
          </Feature>
          <Feature title="Asynchronous chunks support">
            <div>
              Use asynchronous chunks to split your bundle into multiple files
              and load them on-demand improve initial loading times. Split your
              code using dynamic <span className="font-mono">import()</span>{' '}
              function or manually declaring them inside your Webpack config.
            </div>
            <a
              href="https://github.com/callstack/@callstack/nativepack#asynchronous-chunks"
              className="inline-flex items-center mt-6 px-3 py-2 transition ease-in duration-200 rounded-sm font-bold border border-teal-700 hover:text-cool-gray-200 hover:bg-teal-600 hover:border-teal-600"
              target="_blank"
              rel="noreferrer"
            >
              Read more
              <span className="inline-block material-icons text-xl ml-1">
                launch
              </span>
            </a>
          </Feature>
          <Feature title="Configure it your way">
            <div>
              Take full control over the Webpack configuration. Use our APIs -
              plugins and utilities - to make Webpack-produced bundle compatible
              with React Native.
            </div>
            <a
              href="https://github.com/callstack/@callstack/nativepack/blob/main/templates/webpack.config.js"
              className="inline-flex items-center mt-6 px-3 py-2 transition ease-in duration-200 rounded-sm font-bold border border-violet-900 hover:text-cool-gray-200 hover:bg-violet-700 hover:border-violet-700"
              target="_blank"
              rel="noreferrer"
            >
              Check the template
              <span className="inline-block material-icons text-xl ml-1">
                launch
              </span>
            </a>
          </Feature>
        </ul>
      </div>
    </Layout>
  );
}
