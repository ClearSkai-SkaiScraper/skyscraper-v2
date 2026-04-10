declare module "marked" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function marked(input: string, options?: any): string;
  export default marked;
}
