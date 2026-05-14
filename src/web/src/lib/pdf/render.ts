import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import type { ResumeData } from "@/lib/schemas/resume";
import { JakeTemplate } from "./jake-template";

export async function renderResumePdf(data: ResumeData): Promise<Buffer> {
  const element = createElement(JakeTemplate, { data });
  // @ts-expect-error — @react-pdf's Document typing is loose at the element seam.
  return renderToBuffer(element);
}
