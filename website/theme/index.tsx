import {
  Announcement,
  Button,
  HomeBanner,
  HomeFeature,
  HomeFooter,
  HomeHero,
  LinkCard,
  OutlineCTA,
  PrevNextPage,
} from '@callstack/rspress-theme';
import { NoSSR, usePageData } from 'rspress/runtime';
import {
  Badge,
  Link,
  HomeLayout as RspressHomeLayout,
  Layout as RspressLayout,
  getCustomMDXComponent,
} from 'rspress/theme';

const VersionBadge = () => {
  const pageData = usePageData();

  // hide on overview pages since it's badly positioned
  if (pageData.page.frontmatter.overview) {
    return null;
  }

  if (pageData.page.routePath.startsWith('/blog')) {
    return null;
  }

  return (
    <div className="py-2">
      <Badge
        type="info"
        outline
        text={`Version: ${global.__REPACK_DOC_VERSION__ ?? global.__REPACK_DOC_LATEST_VERSION__}`}
      />
    </div>
  );
};

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
      ) : (
        <NoSSR>
          <Announcement
            href="/blog/repack-5-release"
            message="✨ Re.Pack 5 released ✨"
            localStorageKey="repack-5-release-announcement"
          />
        </NoSSR>
      )
    }
    beforeDocContent={<VersionBadge />}
    afterOutline={<OutlineCTA href="https://callstack.com" />}
  />
);

const HomeLayout = () => (
  <RspressHomeLayout
    afterFeatures={
      <>
        <HomeBanner href="https://callstack.com" />
        <HomeFooter />
      </>
    }
  />
);

export { HomeLayout, Layout };

const { code: Code, pre: Pre } = getCustomMDXComponent();

/* expose internal CodeBlock component */
export const CodeBlock = ({ children, language, title }) => {
  return (
    <Pre>
      <Code
        className={`language-${language}`}
        meta={title ? `title="${title}"` : undefined}
      >
        {children}
      </Code>
    </Pre>
  );
};

const CustomLink = (props) => (
  <Link {...props} className={props.className + ' rspress-link'} />
);

/* omit rendering for edge cases */
const CustomPrevNextPage = (props) => {
  if (!props.text) return null;
  return <PrevNextPage {...props} />;
};

export { CustomLink as Link };
export { CustomPrevNextPage as PrevNextPage };

export { HomeFeature, HomeHero, LinkCard, Button };

export * from 'rspress/theme';
