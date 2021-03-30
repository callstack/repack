import { PageEvent } from 'typedoc/dist/lib/output/events';
export interface FrontMatterVars {
    [key: string]: string | number | boolean;
}
/**
 * Prepends YAML block to a string
 * @param contents - the string to prepend
 * @param vars - object of required front matter variables
 */
export declare const prependYAML: (contents: string, vars: FrontMatterVars) => string;
/**
 * Returns the page title as rendered in the document h1(# title)
 * @param page
 */
export declare const getPageTitle: (page: PageEvent) => any;
