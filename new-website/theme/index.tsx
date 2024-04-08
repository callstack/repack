import Theme, { Link } from 'rspress/theme';

const Layout = () => <Theme.Layout />;

export default {
  ...Theme,
  Layout,
};

const CustomLink = (props) => (
  <Link
    {...props}
    style={{ borderBottomStyle: 'solid', borderBottomColor: 'white' }}
  />
);
export { CustomLink as Link };

export * from 'rspress/theme';
