import { renderToStream } from "@react-pdf/renderer";

export async function pdfToUint8(doc: React.ReactElement) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = await renderToStream(doc as any);
  const chunks: Buffer[] = [];
  return new Promise<Uint8Array>((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => {
      const buffer = Buffer.concat(chunks);
      resolve(new Uint8Array(buffer));
    });
    stream.on("error", reject);
  });
}
