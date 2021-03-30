import { ContextAwareRendererComponent } from 'typedoc/dist/lib/output/components';
export declare class ContextAwareHelpers extends ContextAwareRendererComponent {
    publicPath: string;
    namedAnchors: boolean;
    hideBreadcrumbs: boolean;
    hidePageTitle: boolean;
    indexTitle: string;
    initialize(): void;
}
