import { z } from "zod/v4";
import { err, ErrorCodes } from "@/lib/api/response";
import { renderCoverLetterPdf } from "@/lib/pdf/render";

const requestSchema = z.object({
  text: z.string().min(1),
  name: z.string().optional(),
});

/**
 * Render the `cover-letter` skill's plain text to a PDF for upload-only
 * application forms. Ephemeral — the text differs per job, so nothing is stored.
 */
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return err(ErrorCodes.UNPROCESSABLE, "Invalid cover-letter payload", 422, parsed.error.issues);
  }

  const buffer = await renderCoverLetterPdf(parsed.data.text);
  const slug = (parsed.data.name ?? "cover-letter").replace(/[^\w.-]+/g, "-");

  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-length": String(buffer.length),
      "content-disposition": `inline; filename="${slug}.pdf"`,
    },
  });
}
