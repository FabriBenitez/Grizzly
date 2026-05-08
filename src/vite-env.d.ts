/// <reference types="vite/client" />

declare module "*.module.scss" {
  const clases: Record<string, string>;
  export default clases;
}
