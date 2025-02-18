import { Announcement } from '@callstack/rspress-theme';
import { usePageData } from 'rspress/runtime';
import Theme, {
  Badge,
  Link,
  PrevNextPage,
  getCustomMDXComponent,
} from 'rspress/theme';

const VersionBadge = () => {
  const pageData = usePageData();

  // hide on overview pages since it's badly positioned
  if (pageData.page.frontmatter.overview) {
    return null;
  }

  return (
    <div className="py-2">
      <Badge type="info" outline text={`Version ${pageData.page.version}`} />
    </div>
  );
};

const LATEST_VERSION = '5.x';

const OldVersionAnnouncement = ({ href, version }) => (
  <div className="py-2 px-4 flex items-center justify-center bg-amber-50 text-amber-900 border-b border-amber-200">
    You're viewing the documentation for<span className="font-semibold mx-2">{version}.</span>
    Current latest version is <span className="font-semibold mx-2">{LATEST_VERSION}</span>
    <Link 
      href={href} 
      className="ml-3 text-amber-700 hover:text-amber-900 font-medium"
    >
      View the latest version <b>here</b>.
    </Link>
  </div>
);

const Layout = () => (
  <Theme.Layout
    beforeNav={
      <OldVersionAnnouncement
        href="https://re-pack.dev"
        version="2.x"
      />
    }
    beforeDocContent={<VersionBadge />}
  />
);

export default {
  ...Theme,
  Layout,
};

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

export * from 'rspress/theme';
