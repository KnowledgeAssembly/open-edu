export const join = (...args: string[]) => args.join('/');
export const resolve = (...args: string[]) => args.join('/');
export const dirname = (p: string) => p.split('/').slice(0, -1).join('/');
export const basename = (p: string) => p.split('/').pop() ?? '';
export const extname = (p: string) => { const i = p.lastIndexOf('.'); return i >= 0 ? p.slice(i) : ''; };
export const relative = (from: string, to: string) => to;
export default { join, resolve, dirname, basename, extname, relative };
