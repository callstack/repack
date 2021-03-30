"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Comments = void 0;
const fs = require("fs");
const path = require("path");
const Util = require("util");
const Handlebars = require("handlebars");
const typedoc_1 = require("typedoc");
const components_1 = require("typedoc/dist/lib/output/components");
const events_1 = require("typedoc/dist/lib/output/events");
const plugins_1 = require("typedoc/dist/lib/output/plugins");
const theme_1 = require("../theme");
/**
 * This component is essentially a combination of TypeDoc's 'MarkedPlugin' and 'MarkedLinksPlugin'.
 * The options are unchanged , but strips out all of the html configs.
 */
let Comments = class Comments extends components_1.ContextAwareRendererComponent {
    constructor() {
        super(...arguments);
        /**
         * The pattern used to find references in markdown.
         */
        this.includePattern = /\[\[include:([^\]]+?)\]\]/g;
        /**
         * The pattern used to find media links.
         */
        this.mediaPattern = /media:\/\/([^ "\)\]\}]+)/g;
        /**
         * Regular expression for detecting bracket links.
         */
        this.brackets = /\[\[([^\]]+)\]\]/g;
        /**
         * Regular expression for detecting inline tags like {@link ...}.
         */
        this.inlineTag = /(?:\[(.+?)\])?\{@(link|linkcode|linkplain)\s+((?:.|\n)+?)\}/gi;
        this.warnings = [];
    }
    initialize() {
        super.initialize();
        this.listenTo(this.owner, {
            [events_1.RendererEvent.END]: this.onEndRenderer,
        }, undefined, 100);
        const component = this;
        theme_1.default.HANDLEBARS.registerHelper('comment', function () {
            return component.parseComments(this);
        });
    }
    /**
     * Parse the given comemnts string and return the resulting html.
     *
     * @param text  The markdown string that should be parsed.
     * @param context  The current handlebars context.
     * @returns The resulting html string.
     */
    parseComments(text) {
        const context = Object.assign(text, '');
        if (this.includes) {
            text = text.replace(this.includePattern, (match, includesPath) => {
                includesPath = path.join(this.includes, includesPath.trim());
                if (fs.existsSync(includesPath) &&
                    fs.statSync(includesPath).isFile()) {
                    const contents = fs.readFileSync(includesPath, 'utf-8');
                    if (includesPath.substr(-4).toLocaleLowerCase() === '.hbs') {
                        const template = Handlebars.compile(contents);
                        return template(context);
                    }
                    else {
                        return contents;
                    }
                }
                else {
                    return '';
                }
            });
        }
        if (this.mediaDirectory) {
            text = text.replace(this.mediaPattern, (match, mediaPath) => {
                if (fs.existsSync(path.join(this.mediaDirectory, mediaPath))) {
                    return (theme_1.default.HANDLEBARS.helpers.relativeURL('media') +
                        '/' +
                        mediaPath);
                }
                else {
                    return match;
                }
            });
        }
        return this.replaceInlineTags(this.replaceBrackets(text));
    }
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
    replaceBrackets(text) {
        return text.replace(this.brackets, (match, content) => {
            const split = plugins_1.MarkedLinksPlugin.splitLinkText(content);
            return this.buildLink(match, split.target, split.caption);
        });
    }
    /**
     * Find symbol {@link ...} strings in text and turn into html links
     *
     * @param text  The string in which to replace the inline tags.
     * @return      The updated string.
     */
    replaceInlineTags(text) {
        return text.replace(this.inlineTag, (match, leading, tagName, content) => {
            const split = plugins_1.MarkedLinksPlugin.splitLinkText(content);
            const target = split.target;
            const caption = leading || split.caption;
            const monospace = tagName === 'linkcode';
            return this.buildLink(match, target, caption, monospace);
        });
    }
    /**
     * Format a link with the given text and target.
     *
     * @param original   The original link string, will be returned if the target cannot be resolved..
     * @param target     The link target.
     * @param caption    The caption of the link.
     * @param monospace  Whether to use monospace formatting or not.
     * @returns A html link tag.
     */
    buildLink(original, target, caption, monospace) {
        if (!this.urlPrefix.test(target)) {
            let reflection;
            if (this.reflection) {
                reflection = this.reflection.findReflectionByName(target);
            }
            else if (this.project) {
                reflection = this.project.findReflectionByName(target);
            }
            if (reflection && reflection.url) {
                if (this.urlPrefix.test(reflection.url)) {
                    target = reflection.url;
                }
                else {
                    target = theme_1.default.HANDLEBARS.helpers.relativeURL(reflection.url);
                }
            }
            else {
                const fullName = (this.reflection || this.project).getFullName();
                this.warnings.push(`In ${fullName}: ${original}`);
                return original;
            }
        }
        if (monospace) {
            caption = '`' + caption + '`';
        }
        return Util.format('[%s](%s)', caption, target);
    }
    /**
     * Triggered when [[Renderer]] is finished
     */
    onEndRenderer(event) {
        if (this.listInvalidSymbolLinks && this.warnings.length > 0) {
            this.application.logger.warn('Found invalid symbol reference(s) in JSDocs, ' +
                'they will not render as links in the generated documentation.');
            for (const warning of this.warnings) {
                this.application.logger.write('  ' + warning);
            }
        }
    }
};
__decorate([
    typedoc_1.BindOption('includes')
], Comments.prototype, "includes", void 0);
__decorate([
    typedoc_1.BindOption('media')
], Comments.prototype, "mediaDirectory", void 0);
__decorate([
    typedoc_1.BindOption('listInvalidSymbolLinks')
], Comments.prototype, "listInvalidSymbolLinks", void 0);
Comments = __decorate([
    components_1.Component({ name: 'comments' })
], Comments);
exports.Comments = Comments;
