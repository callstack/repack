import { PrevNextPage, VersionBadge } from '@callstack/rspress-theme';
import { NoSSR } from 'rspress/runtime';
import { CodeBlockRuntime, Link, Layout as RspressLayout } from 'rspress/theme';

const OldVersionAnnouncement = ({ version, latestVersion }) => (
  <div className="py-2 px-4 flex flex-col sm:flex-row items-center justify-center bg-amber-50 text-amber-900 border-b border-amber-200 text-sm">
    <div className="flex flex-wrap justify-center">
      <span>You're viewing the documentation for</span>
      <span className="font-semibold mx-2">{`${version}.`}</span>
      <span>Current latest version is</span>
      <span className="font-semibold mx-2">{`${latestVersion}.`}</span>
    </div>
    <Link
      href="https://re-pack.dev"
      className="mt-1 sm:mt-0 sm:ml-2 text-amber-700 hover:text-amber-900 font-medium whitespace-nowrap"
    >
      View latest version <b>here</b>.
    </Link>
  </div>
);

const Layout = () => (
  <RspressLayout
    beforeNav={
      global.__REPACK_DOC_VERSION__ &&
      global.__REPACK_DOC_VERSION__ !== global.__REPACK_DOC_LATEST_VERSION__ ? (
        <NoSSR>
          <OldVersionAnnouncement
            version={global.__REPACK_DOC_VERSION__}
            latestVersion={global.__REPACK_DOC_LATEST_VERSION__}
          />
        </NoSSR>
      ) : null
    }
    beforeDocContent={
      <VersionBadge
        version={`${global.__REPACK_DOC_VERSION__ ?? global.__REPACK_DOC_LATEST_VERSION__}`}
      />
    }
  />
);

export { Layout };

/* expose internal CodeBlock component */
export const CodeBlock = ({ children, language, title }) => {
  // @ts-ignore
  return <CodeBlockRuntime lang={language} title={title} code={children} />;
};

/* omit rendering for edge cases */
const CustomPrevNextPage = (props) => {
  if (!props.text) return null;
  return <PrevNextPage {...props} />;
};

export { CustomPrevNextPage as PrevNextPage };

export * from 'rspress/theme';
