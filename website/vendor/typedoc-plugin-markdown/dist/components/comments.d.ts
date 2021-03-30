import { ContextAwareRendererComponent } from 'typedoc/dist/lib/output/components';
import { RendererEvent } from 'typedoc/dist/lib/output/events';
/**
 * This component is essentially a combination of TypeDoc's 'MarkedPlugin' and 'MarkedLinksPlugin'.
 * The options are unchanged , but strips out all of the html configs.
 */
export declare class Comments extends ContextAwareRendererComponent {
    includes: string;
    mediaDirectory: string;
    listInvalidSymbolLinks: boolean;
    /**
     * The pattern used to find references in markdown.
     */
    private includePattern;
    /**
     * The pattern used to find media links.
     */
    private mediaPattern;
    /**
     * Regular expression for detecting bracket links.
     */
    private brackets;
    /**
     * Regular expression for detecting inline tags like {@link ...}.
     */
    private inlineTag;
    private warnings;
    initialize(): void;
    /**
     * Parse the given comemnts string and return the resulting html.
     *
     * @param text  The markdown string that should be parsed.
     * @param context  The current handlebars context.
     * @returns The resulting html string.
     */
    parseComments(text: string): string;
    /**
     * Find all references to symbols within the given text and transform them into a link.
     *
     * This function is aware of the current context and will try to find the symbol within the
     * current reflection. It will walk up the reflection chain till the symbol is found or the
     * root reflection is reached. As a last resort the function will search the entire project
     * for the given symbol.
     *
     * @param text  The text that should be parsed.
     * @returns The text with symbol references replaced by links.
     */
    private replaceBrackets;
    /**
     * Find symbol {@link ...} strings in text and turn into html links
     *
     * @param text  The string in which to replace the inline tags.
     * @return      The updated string.
     */
    private replaceInlineTags;
    /**
     * Format a link with the given text and target.
     *
     * @param original   The original link string, will be returned if the target cannot be resolved..
     * @param target     The link target.
     * @param caption    The caption of the link.
     * @param monospace  Whether to use monospace formatting or not.
     * @returns A html link tag.
     */
    private buildLink;
    /**
     * Triggered when [[Renderer]] is finished
     */
    onEndRenderer(event: RendererEvent): void;
}
