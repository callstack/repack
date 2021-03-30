"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const Handlebars = require("handlebars");
const typedoc_1 = require("typedoc");
const models_1 = require("typedoc/dist/lib/models");
const events_1 = require("typedoc/dist/lib/output/events");
const theme_1 = require("typedoc/dist/lib/output/theme");
const breadcrumbs_1 = require("./components/breadcrumbs");
const comments_1 = require("./components/comments");
const options_1 = require("./components/options");
const toc_1 = require("./components/toc");
/**
 * The MarkdownTheme is based on TypeDoc's DefaultTheme @see https://github.com/TypeStrong/typedoc/blob/master/src/lib/output/themes/DefaultTheme.ts.
 * - html specific components are removed from the renderer
 * - markdown specefic components have been added
 */
class MarkdownTheme extends theme_1.Theme {
    constructor(renderer, basePath) {
        super(renderer, basePath);
        this.listenTo(renderer, events_1.PageEvent.END, this.onPageEnd, 1024);
        // cleanup html specific components
        renderer.removeComponent('assets');
        renderer.removeComponent('javascript-index');
        renderer.removeComponent('toc');
        renderer.removeComponent('pretty-print');
        renderer.removeComponent('marked-links');
        renderer.removeComponent('legend');
        renderer.removeComponent('navigation');
        // add markdown related componenets / helpers
        renderer.addComponent('options', new options_1.ContextAwareHelpers(renderer));
        renderer.addComponent('breadcrumbs', new breadcrumbs_1.Breadcrumbs(renderer));
        renderer.addComponent('comments', new comments_1.Comments(renderer));
        renderer.addComponent('toc', new toc_1.TableOfContents(renderer));
    }
    // formarts page content after render
    static formatContents(contents) {
        return (contents
            .replace(/[\r\n]{3,}/g, '\n\n')
            .replace(/!spaces/g, '')
            .replace(/^\s+|\s+$/g, '') + '\n');
    }
    /**
     * Test if directory is output directory
     * @param outputDirectory
     */
    isOutputDirectory(outputDirectory) {
        let isOutputDirectory = true;
        const listings = fs.readdirSync(outputDirectory);
        listings.forEach((listing) => {
            if (!this.allowedDirectoryListings().includes(listing)) {
                isOutputDirectory = false;
                return;
            }
        });
        return isOutputDirectory;
    }
    // The allowed directory and files listing used to check the output directory
    allowedDirectoryListings() {
        return [
            this.entryDocument,
            this.globalsFile,
            ...this.mappings.map((mapping) => mapping.directory),
            'media',
            '.DS_Store',
        ];
    }
    /**
     * This method is essentially a copy of the TypeDocs DefaultTheme.getUrls with extensions swapped out to .md
     * Map the models of the given project to the desired output files.
     *
     * @param project  The project whose urls should be generated.
     * @returns        A list of [[UrlMapping]] instances defining which models
     *                 should be rendered to which files.
     */
    getUrls(project) {
        var _a;
        const urls = [];
        if (this.readme === 'none') {
            project.url = this.entryDocument;
            urls.push(new typedoc_1.UrlMapping(this.entryDocument, project, 'reflection.hbs'));
        }
        else {
            project.url = this.globalsFile;
            urls.push(new typedoc_1.UrlMapping(this.globalsFile, project, 'reflection.hbs'));
            urls.push(new typedoc_1.UrlMapping(this.entryDocument, project, 'index.hbs'));
        }
        (_a = project.children) === null || _a === void 0 ? void 0 : _a.forEach((child) => {
            if (child instanceof typedoc_1.DeclarationReflection) {
                this.buildUrls(child, urls);
            }
        });
        return urls;
    }
    /**
     * This is mostly a copy of the TypeDoc DefaultTheme.buildUrls method with .html ext switched to .md
     * Builds the url for the the given reflection and all of its children.
     *
     * @param reflection  The reflection the url should be created for.
     * @param urls The array the url should be appended to.
     * @returns The altered urls array.
     */
    buildUrls(reflection, urls) {
        const mapping = this.mappings.find((mapping) => reflection.kindOf(mapping.kind));
        if (mapping) {
            if (!reflection.url || !MarkdownTheme.URL_PREFIX.test(reflection.url)) {
                const url = this.toUrl(mapping, reflection);
                urls.push(new typedoc_1.UrlMapping(url, reflection, mapping.template));
                reflection.url = url;
                reflection.hasOwnDocument = true;
            }
            for (const child of reflection.children || []) {
                if (mapping.isLeaf) {
                    this.applyAnchorUrl(child, reflection);
                }
                else {
                    this.buildUrls(child, urls);
                }
            }
        }
        else if (reflection.parent) {
            this.applyAnchorUrl(reflection, reflection.parent);
        }
        return urls;
    }
    /**
     * Returns the full url of a given mapping and reflection
     * @param mapping
     * @param reflection
     */
    toUrl(mapping, reflection) {
        return mapping.directory + '/' + this.getUrl(reflection);
    }
    /**
     * @see DefaultTheme.getUrl
     * Return a url for the given reflection.
     *
     * @param reflection  The reflection the url should be generated for.
     * @param relative    The parent reflection the url generation should stop on.
     * @param separator   The separator used to generate the url.
     * @returns           The generated url.
     */
    getUrl(reflection, relative) {
        let url = reflection.getAlias();
        if (reflection.parent &&
            reflection.parent !== relative &&
            !(reflection.parent instanceof typedoc_1.ProjectReflection)) {
            url =
                this.getUrl(reflection.parent, relative) + this.filenameSeparator + url;
        }
        return url;
    }
    /**
     * Similar to DefaultTheme.applyAnchorUrl method with added but the anchors are computed from the reflection structure
     * Generate an anchor url for the given reflection and all of its children.
     *
     * @param reflection  The reflection an anchor url should be created for.
     * @param container   The nearest reflection having an own document.
     */
    applyAnchorUrl(reflection, container) {
        if (!reflection.url || !MarkdownTheme.URL_PREFIX.test(reflection.url)) {
            const reflectionId = reflection.name.toLowerCase();
            const anchor = this.toAnchorRef(reflectionId);
            reflection.url = container.url + '#' + anchor;
            reflection.anchor = anchor;
            reflection.hasOwnDocument = false;
        }
        reflection.traverse((child) => {
            if (child instanceof typedoc_1.DeclarationReflection) {
                this.applyAnchorUrl(child, container);
            }
        });
    }
    toAnchorRef(reflectionId) {
        return reflectionId;
    }
    getNavigation(project) {
        var _a, _b, _c;
        const buildNavigationGroups = (navigation, groups) => {
            groups
                .filter((group) => group.allChildrenHaveOwnDocument())
                .forEach((reflectionGroup) => {
                var _a, _b;
                let reflectionGroupItem = (_a = navigation.children) === null || _a === void 0 ? void 0 : _a.find((child) => child.title === reflectionGroup.title && child.isLabel === true);
                if (!reflectionGroupItem) {
                    reflectionGroupItem = createNavigationItem(reflectionGroup.title, undefined, true);
                    (_b = navigation.children) === null || _b === void 0 ? void 0 : _b.push(reflectionGroupItem);
                }
                reflectionGroup.children.forEach((reflectionGroupChild) => {
                    var _a;
                    const reflectionGroupChildItem = createNavigationItem(reflectionGroupChild.getFullName(), reflectionGroupChild.url, true);
                    if (reflectionGroupItem) {
                        (_a = reflectionGroupItem.children) === null || _a === void 0 ? void 0 : _a.push(reflectionGroupChildItem);
                    }
                    const reflection = reflectionGroupChild;
                    if (reflection.groups) {
                        buildNavigationGroups(navigation, reflection.groups);
                    }
                });
            });
        };
        const createNavigationItem = (title, url, isLabel) => {
            const navigationItem = new typedoc_1.NavigationItem(title.replace(/\"/g, ''), url);
            navigationItem.isLabel = isLabel;
            navigationItem.children = [];
            delete navigationItem.reflection;
            delete navigationItem.parent;
            return navigationItem;
        };
        const sortNavigationGroups = (a, b) => {
            const weights = {
                ['Namespaces']: 1,
                ['Enumerations']: 2,
                ['Classes']: 3,
                ['Interfaces']: 4,
                ['Type aliases']: 5,
                ['Variables']: 6,
                ['Functions']: 7,
                ['Object literals']: 8,
            };
            const aWeight = weights[a.title] || 0;
            const bWeight = weights[b.title] || 0;
            return aWeight - bWeight;
        };
        const hasSeperateGlobals = this.readme !== 'none';
        const navigation = createNavigationItem(project.name, undefined, false);
        const rootName = this.entryPoints.length > 1 ? 'Modules' : 'Exports';
        (_a = navigation.children) === null || _a === void 0 ? void 0 : _a.push(createNavigationItem(hasSeperateGlobals ? 'Readme' : rootName, this.entryDocument, false));
        if (hasSeperateGlobals) {
            (_b = navigation.children) === null || _b === void 0 ? void 0 : _b.push(createNavigationItem(rootName, this.globalsFile, false));
        }
        if (project.groups) {
            buildNavigationGroups(navigation, project.groups);
        }
        (_c = navigation.children) === null || _c === void 0 ? void 0 : _c.sort(sortNavigationGroups);
        return navigation;
    }
    onPageEnd(page) {
        page.contents = page.contents
            ? MarkdownTheme.formatContents(page.contents)
            : '';
    }
    get mappings() {
        return [
            {
                kind: [models_1.ReflectionKind.Class],
                isLeaf: false,
                directory: 'classes',
                template: 'reflection.hbs',
            },
            {
                kind: [models_1.ReflectionKind.Interface],
                isLeaf: false,
                directory: 'interfaces',
                template: 'reflection.hbs',
            },
            {
                kind: [models_1.ReflectionKind.Enum],
                isLeaf: false,
                directory: 'enums',
                template: 'reflection.hbs',
            },
            {
                kind: [models_1.ReflectionKind.Namespace, models_1.ReflectionKind.Module],
                isLeaf: false,
                directory: 'modules',
                template: 'reflection.hbs',
            },
            ...(this.allReflectionsHaveOwnDocument
                ? [
                    {
                        kind: [models_1.ReflectionKind.Variable],
                        isLeaf: true,
                        directory: 'variables',
                        template: 'reflection.member.hbs',
                    },
                    {
                        kind: [models_1.ReflectionKind.TypeAlias],
                        isLeaf: true,
                        directory: 'types',
                        template: 'reflection.member.hbs',
                    },
                    {
                        kind: [models_1.ReflectionKind.Function],
                        isLeaf: true,
                        directory: 'functions',
                        template: 'reflection.member.hbs',
                    },
                    {
                        kind: [models_1.ReflectionKind.ObjectLiteral],
                        isLeaf: true,
                        directory: 'literals',
                        template: 'reflection.member.hbs',
                    },
                ]
                : []),
        ];
    }
    get globalsFile() {
        return 'modules.md';
    }
}
// creates an isolated Handlebars environment to store context aware helpers
MarkdownTheme.HANDLEBARS = Handlebars.create();
MarkdownTheme.URL_PREFIX = /^(http|ftp)s?:\/\//;
__decorate([
    typedoc_1.BindOption('readme')
], MarkdownTheme.prototype, "readme", void 0);
__decorate([
    typedoc_1.BindOption('entryPoints')
], MarkdownTheme.prototype, "entryPoints", void 0);
__decorate([
    typedoc_1.BindOption('allReflectionsHaveOwnDocument')
], MarkdownTheme.prototype, "allReflectionsHaveOwnDocument", void 0);
__decorate([
    typedoc_1.BindOption('filenameSeparator')
], MarkdownTheme.prototype, "filenameSeparator", void 0);
__decorate([
    typedoc_1.BindOption('entryDocument')
], MarkdownTheme.prototype, "entryDocument", void 0);
exports.default = MarkdownTheme;
