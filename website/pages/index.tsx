import Head from 'next/head';
import Image from 'next/image';
import NextLink from 'next/link';
import { Layout } from '../components/Layout';

export default function Home() {
  return (
    <Layout>
      <Head>
        <title>react-native-webpack-toolkit</title>
      </Head>
      <h1 className="text-center text-3xl italic tracking-wide xl:px-80">
        A Webpack-based toolkit to build your React Native application with full
        support of Webpack ecosystem.
      </h1>
      <div className="flex flex-row justify-center mt-8">
        <NextLink href="https://github.com/callstack/react-native-webpack-toolkit#react-native-webpack-toolkit">
          <a className="inline-flex items-center mx-2 px-3 py-2 transition ease-in duration-200 rounded-sm font-bold border border-emerald-700 hover:text-cool-gray-200 hover:bg-emerald-600 hover:border-emerald-600">
            Read more
            <span className="inline-block material-icons text-xl ml-1">
              launch
            </span>
          </a>
        </NextLink>
        <NextLink href="https://github.com/callstack/react-native-webpack-toolkit#installation--setup">
          <a className="inline-flex items-center mx-2 px-3 py-2 transition ease-in duration-200 rounded-sm font-bold border border-orange-800 hover:text-cool-gray-200 hover:bg-orange-700 hover:border-orange-700">
            Get started
            <span className="inline-block material-icons text-xl ml-1">
              launch
            </span>
          </a>
        </NextLink>
      </div>
      <div className="flex flex-row justify-between mt-10 py-16">
        <div className="w-1/3 px-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 3916 1524"
            className="h-20 -ml-5"
          >
            <title>logo-on-dark-bg</title>
            <path
              fill="#FFF"
              d="M822 336l387 218.9v437.9l-387 218.9-387-218.9V554.9z"
            />
            <path
              fill="#8ED6FB"
              d="M1139.9 977.7l-305.1 172.6v-134.4l190.1-104.6 115 66.4zm20.9-18.9V597.9l-111.6 64.5v232l111.6 64.4zm-657.9 18.9L808 1150.3v-134.4L617.8 911.3l-114.9 66.4zM482 958.8V597.9l111.6 64.5v232L482 958.8zm13.1-384.3l312.9-177v129.9L607.5 637.7l-1.6.9-110.8-64.1zm652.6 0l-312.9-177v129.9l200.5 110.2 1.6.9 110.8-64z"
            />
            <path
              fill="#1C78C0"
              d="M808 985.3L620.4 882.1V677.8L808 786.1v199.2zm26.8 0l187.6-103.1V677.8L834.8 786.1v199.2zm-13.4-207zM633.1 654.2l188.3-103.5 188.3 103.5-188.3 108.7-188.3-108.7z"
            />
            <path
              fill="#F5FAFA"
              d="M1599.3 912.3h82.5l84.1-280.2h-80.4l-49.8 198.8-53.1-198.8H1513l-53.6 198.8-49.3-198.8h-80.4l83.6 280.2h82.5l52-179.5 51.5 179.5zM1770.2 773c0 84.1 57.3 146.3 147.4 146.3 69.7 0 107.2-41.8 117.9-61.6l-48.8-37c-8 11.8-30 34.3-68.1 34.3-41.3 0-71.3-26.8-72.9-64.3H2043c.5-5.4.5-10.7.5-16.1 0-91.6-49.3-149.5-136.1-149.5-79.9 0-137.2 63.2-137.2 147.9zm77.7-30.6c3.2-32.1 25.7-56.8 60.6-56.8 33.8 0 58.4 22.5 60 56.8h-120.6zm223.5 169.9h69.7v-28.9c7.5 9.1 35.4 35.9 83.1 35.9 80.4 0 137.2-60.5 137.2-146.8 0-86.8-52.5-147.3-132.9-147.3-48.2 0-76.1 26.8-83.1 36.4V524.9h-73.9v387.4zm71.8-139.3c0-52.5 31.1-82.5 71.8-82.5 42.9 0 71.8 33.8 71.8 82.5 0 49.8-30 80.9-71.8 80.9-45 0-71.8-36.5-71.8-80.9zm247 239.5h73.9V883.3c7 9.1 34.8 35.9 83.1 35.9 80.4 0 132.9-60.5 132.9-147.3 0-85.7-56.8-146.8-137.2-146.8-47.7 0-75.6 26.8-83.1 36.4V632h-69.7v380.5zm71.8-241.1c0-44.5 26.8-80.9 71.8-80.9 41.8 0 71.8 31.1 71.8 80.9 0 48.8-28.9 82.5-71.8 82.5-40.7 0-71.8-30-71.8-82.5zm231.5 54.1c0 58.9 48.2 93.8 105 93.8 32.2 0 53.6-9.6 68.1-25.2l4.8 18.2h65.4V734.9c0-62.7-26.8-109.8-116.8-109.8-42.9 0-85.2 16.1-110.4 33.2l27.9 50.4c20.9-10.7 46.6-19.8 74.5-19.8 32.7 0 50.9 16.6 50.9 41.3v18.2c-10.2-7-32.2-15.5-60.6-15.5-65.4-.1-108.8 37.4-108.8 92.6zm73.9-2.2c0-23 19.8-39.1 48.2-39.1s48.8 14.5 48.8 39.1c0 23.6-20.4 38.6-48.2 38.6s-48.8-15.5-48.8-38.6zm348.9 30.6c-46.6 0-79.8-33.8-79.8-81.4 0-45 29.5-82 77.2-82 31.6 0 53.1 15.5 65.4 26.8l20.9-62.2c-18.2-13.9-47.2-30-88.4-30-85.2 0-149 62.7-149 147.9s62.2 146.3 149.5 146.3c40.7 0 71.3-17.1 87.3-30l-19.8-60.5c-12.4 10.1-34.9 25.1-63.3 25.1zm110.9 58.4h73.9V767.6l93.8 144.7h86.8L3375.6 759l98.6-127h-83.1l-90 117.9v-225h-73.9v387.4z"
            />
          </svg>
          <h2 className="text-2xl font-bold mb-4">Powered by Webpack</h2>
          <div>
            Leverage full Webpack ecosystem of plugins and loaders. Use plethora
            of Webpack configuration options to adjust the bundling to your
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
        </div>
        <div className="w-1/3 px-8">
          <span className="material-icons text-5xl my-4">devices</span>
          <h2 className="text-2xl font-bold mb-4">
            Develop and bundle for any platform
          </h2>
          <span>
            Develop your application for any platform. Use built-in support for
            Android and iOS or bring support for your out-of-tree platform.
            Everything is configurable, nothing is hardcoded.
          </span>
        </div>
        <div className="w-1/3 px-8">
          <span className="material-icons text-5xl my-4">developer_mode</span>
          <h2 className="text-2xl font-bold mb-4">
            Fully-featured development server
          </h2>
          <div>
            Build your application with ease. Take advantage of built-in support
            for Hot Module Replacement and React Refresh, symnbolication and
            Remote JavaScript debugging support.
          </div>
          <NextLink href="https://github.com/callstack/react-native-webpack-toolkit#features">
            <a className="inline-flex items-center mt-6 px-3 py-2 transition ease-in duration-200 rounded-sm font-bold border border-orange-800 hover:text-cool-gray-200 hover:bg-orange-700 hover:border-orange-700">
              Check the feature list
              <span className="inline-block material-icons text-xl ml-1">
                launch
              </span>
            </a>
          </NextLink>
        </div>
      </div>
      <div className="mx-8 border-b border-gray-900" />
      <div className="flex flex-row justify-between py-16">
        <div className="w-1/3 px-8">
          <div className="w-12 h-12 relative mb-6">
            <Image src="/flipper.png" alt="me" layout="fill" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Built-in Flipper support</h2>
          <div>
            Use Flipper platform to inspect Application logs, Development server
            logs, React component tree with React DevTools, Layout, Network,
            Crashes and more.
          </div>
        </div>
        <div className="w-1/3 px-8">
          <span className="material-icons text-5xl mb-6">device_hub</span>
          <h2 className="text-2xl font-bold mb-4">
            Asynchronous chunks support
          </h2>
          <div>
            Use asynchronous chunks to split your bundle into multiple files and
            load them on-demand improve initial loading times. Split your code
            using dynamic <span className="font-mono">import()</span> function
            or manually declaring them inside your Webpack config.
          </div>
          <NextLink href="https://github.com/callstack/react-native-webpack-toolkit#asynchronous-chunks">
            <a className="inline-flex items-center mt-6 px-3 py-2 transition ease-in duration-200 rounded-sm font-bold border border-teal-700 hover:text-cool-gray-200 hover:bg-teal-600 hover:border-teal-600">
              Read more
              <span className="inline-block material-icons text-xl ml-1">
                launch
              </span>
            </a>
          </NextLink>
        </div>
        <div className="w-1/3 px-8">
          <span className="material-icons text-5xl mb-6">settings</span>
          <h2 className="text-2xl font-bold mb-4">
            Configure Webpack your way
          </h2>
          <div></div>
          <NextLink href="https://github.com/callstack/react-native-webpack-toolkit/blob/main/templates/webpack.config.js">
            <a className="inline-flex items-center mt-6 px-3 py-2 transition ease-in duration-200 rounded-sm font-bold border border-violet-900 hover:text-cool-gray-200 hover:bg-violet-700 hover:border-violet-700">
              Check the template
              <span className="inline-block material-icons text-xl ml-1">
                launch
              </span>
            </a>
          </NextLink>
        </div>
      </div>
    </Layout>
  );
}
