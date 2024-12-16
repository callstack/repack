import { Announcement } from '@callstack/rspress-theme';
import Theme, {
  Link,
  PrevNextPage,
  getCustomMDXComponent,
} from 'rspress/theme';

const Layout = () => (
  <Theme.Layout
    beforeNav={
      <Announcement
        href="5.x/docs/getting-started"
        message="Re.Pack 5 with support for Rspack is coming!"
        localStorageKey="repack-announcement"
      />
    }
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
