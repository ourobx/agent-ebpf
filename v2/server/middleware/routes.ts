import { defineEventHandler, sendRedirect } from "h3";

export default defineEventHandler((event) => {
  const reqUrl = event.node.req.url || "/";
  const pathname = reqUrl.split("?")[0];

  if (
    pathname === "/landing.html" ||
    pathname === "/landing" ||
    pathname === "/home" ||
    pathname === "/index.html" ||
    pathname === "/index" ||
    pathname === "/console" ||
    pathname === "/app" ||
    pathname === "/dashboard"
  ) {
    return sendRedirect(event, "/#", 302);
  }
});
