import type { MDXComponents } from "mdx/types";
import {
  DocsBlockquote,
  DocsCode,
  DocsH1,
  DocsH2,
  DocsH3,
  DocsH4,
  DocsHr,
  DocsLi,
  DocsLink,
  DocsOl,
  DocsP,
  DocsPre,
  DocsTable,
  DocsUl,
} from "@/components/features/docs";

/** Global element map for `page.mdx` routes - MUI-styled so docs inherit the theme. */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: DocsH1,
    h2: DocsH2,
    h3: DocsH3,
    h4: DocsH4,
    p: DocsP,
    a: DocsLink,
    ul: DocsUl,
    ol: DocsOl,
    li: DocsLi,
    code: DocsCode,
    pre: DocsPre,
    blockquote: DocsBlockquote,
    table: DocsTable,
    hr: DocsHr,
    ...components,
  };
}
