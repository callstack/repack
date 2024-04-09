import Theme, { Link, getCustomMDXComponent } from 'rspress/theme';

export default Theme;

const { code: Code, pre: Pre } = getCustomMDXComponent();

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
  <Link
    {...props}
    style={{ borderBottomStyle: 'solid', borderBottomColor: 'white' }}
  />
);

export { CustomLink as Link };

export * from 'rspress/theme';
