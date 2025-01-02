import { Announcement } from '@callstack/rspress-theme';
import { useVersion } from 'rspress/runtime';
import Theme, {
  Badge,
  Link,
  PrevNextPage,
  getCustomMDXComponent,
} from 'rspress/theme';

const VersionBadge = () => {
  const version = useVersion();
  return <Badge type="info" outline text={`Version ${version}`} />;
};

const Layout = () => (
  <Theme.Layout
    beforeNav={
      <Announcement
        href="5.x/docs/getting-started"
        message="Re.Pack 5 with support for Rspack is coming!"
        localStorageKey="repack-announcement"
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
