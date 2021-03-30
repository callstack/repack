import { ContextAwareRendererComponent } from 'typedoc/dist/lib/output/components';
export declare class Breadcrumbs extends ContextAwareRendererComponent {
    entryPoints: string[];
    readme: string;
    entryDocument: string;
    initialize(): void;
}
