import * as Handlebars from 'handlebars';
import { DeclarationReflection, NavigationItem, ProjectReflection, Reflection, Renderer, UrlMapping } from 'typedoc';
import { ReflectionKind } from 'typedoc/dist/lib/models';
import { Theme } from 'typedoc/dist/lib/output/theme';
import { TemplateMapping } from 'typedoc/dist/lib/output/themes/DefaultTheme';
/**
 * The MarkdownTheme is based on TypeDoc's DefaultTheme @see https://github.com/TypeStrong/typedoc/blob/master/src/lib/output/themes/DefaultTheme.ts.
 * - html specific components are removed from the renderer
 * - markdown specefic components have been added
 */
export default class MarkdownTheme extends Theme {
    readme: string;
    entryPoints: string[];
    allReflectionsHaveOwnDocument: boolean;
    filenameSeparator: string;
    entryDocument: string;
    static HANDLEBARS: typeof Handlebars;
    static URL_PREFIX: RegExp;
    static formatContents(contents: string): string;
    constructor(renderer: Renderer, basePath: string);
    /**
     * Test if directory is output directory
     * @param outputDirectory
     */
    isOutputDirectory(outputDirectory: string): boolean;
    allowedDirectoryListings(): string[];
    /**
     * This method is essentially a copy of the TypeDocs DefaultTheme.getUrls with extensions swapped out to .md
     * Map the models of the given project to the desired output files.
     *
     * @param project  The project whose urls should be generated.
     * @returns        A list of [[UrlMapping]] instances defining which models
     *                 should be rendered to which files.
     */
    getUrls(project: ProjectReflection): UrlMapping[];
    /**
     * This is mostly a copy of the TypeDoc DefaultTheme.buildUrls method with .html ext switched to .md
     * Builds the url for the the given reflection and all of its children.
     *
     * @param reflection  The reflection the url should be created for.
     * @param urls The array the url should be appended to.
     * @returns The altered urls array.
     */
    buildUrls(reflection: DeclarationReflection, urls: UrlMapping[]): UrlMapping[];
    /**
     * Returns the full url of a given mapping and reflection
     * @param mapping
     * @param reflection
     */
    toUrl(mapping: TemplateMapping, reflection: DeclarationReflection): string;
    /**
     * @see DefaultTheme.getUrl
     * Return a url for the given reflection.
     *
     * @param reflection  The reflection the url should be generated for.
     * @param relative    The parent reflection the url generation should stop on.
     * @param separator   The separator used to generate the url.
     * @returns           The generated url.
     */
    getUrl(reflection: Reflection, relative?: Reflection): string;
    /**
     * Similar to DefaultTheme.applyAnchorUrl method with added but the anchors are computed from the reflection structure
     * Generate an anchor url for the given reflection and all of its children.
     *
     * @param reflection  The reflection an anchor url should be created for.
     * @param container   The nearest reflection having an own document.
     */
    applyAnchorUrl(reflection: Reflection, container: Reflection): void;
    toAnchorRef(reflectionId: string): string;
    getNavigation(project: ProjectReflection): NavigationItem;
    private onPageEnd;
    get mappings(): {
        kind: ReflectionKind[];
        isLeaf: boolean;
        directory: string;
        template: string;
    }[];
    get globalsFile(): string;
}
