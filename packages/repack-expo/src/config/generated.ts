import { CodeGenerator } from 'expo/config-plugins';
import { ConfigPluginError } from './ConfigPluginError.js';

type GeneratedSectionOptions = {
  comment: string;
  contents: string;
  newSrc: string;
  tag: string;
};

export function assertUniqueAnchor(
  contents: string,
  anchor: string | RegExp,
  description: string
): void {
  const matches =
    typeof anchor === 'string'
      ? contents.split(anchor).length - 1
      : [...contents.matchAll(new RegExp(anchor, 'g'))].length;

  if (matches !== 1) {
    throw new ConfigPluginError({
      code: 'INCOMPATIBLE_NATIVE_TEMPLATE',
      message: `Expected exactly one ${description}, found ${matches}.`,
      recovery:
        'Regenerate the native project with expo prebuild --clean. If the generated shape still differs, report it for explicit support.',
    });
  }
}

export function hasIntactGeneratedSection(
  options: GeneratedSectionOptions
): boolean {
  const { comment, contents, newSrc, tag } = options;
  const header = CodeGenerator.createGeneratedHeaderComment(
    newSrc,
    tag,
    comment
  );
  const begin = `@generated begin ${tag}`;
  const end = `${comment} @generated end ${tag}`;
  const expectedSection = [header, newSrc, end].join('\n');

  if (contents.includes(expectedSection)) {
    assertUniqueAnchor(contents, begin, `${tag} generated section`);
    assertUniqueAnchor(contents, end, `${tag} generated section end`);
    assertUniqueAnchor(contents, expectedSection, `${tag} generated contents`);
    return true;
  }

  if (contents.includes(begin) || contents.includes(end)) {
    throw new ConfigPluginError({
      code: 'INCOMPATIBLE_NATIVE_TEMPLATE',
      message: `The generated ${tag} section was modified manually.`,
      recovery:
        'Restore the generated section or run expo prebuild --clean before applying the plugin again.',
    });
  }

  return false;
}

export function replaceLineWithGeneratedSection(options: {
  anchorLine: string;
  comment: string;
  contents: string;
  replacementLine: string;
  tag: string;
}): string {
  const { anchorLine, comment, contents, replacementLine, tag } = options;
  const header = CodeGenerator.createGeneratedHeaderComment(
    replacementLine,
    tag,
    comment
  );
  const end = `${comment} @generated end ${tag}`;

  if (
    hasIntactGeneratedSection({
      comment,
      contents,
      newSrc: replacementLine,
      tag,
    })
  ) {
    return contents;
  }

  assertUniqueAnchor(contents, anchorLine, `${tag} native anchor`);
  return contents.replace(
    anchorLine,
    [header, replacementLine, end].join('\n')
  );
}
