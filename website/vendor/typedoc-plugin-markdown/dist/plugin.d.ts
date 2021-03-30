import { ConverterComponent } from 'typedoc/dist/lib/converter/components';
export declare class MarkdownPlugin extends ConverterComponent {
    theme: string;
    initialize(): void;
    /**
     * Overide default assets
     */
    onBegin(): void;
    /**
     * Load markdown theme and perform additional checks
     */
    onResolveBegin(): void;
    /**
     * Checks if the custom theme class is initiated from markdown theme
     */
    isMarkdownTheme(themeFileName: string): boolean;
}
